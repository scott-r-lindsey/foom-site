"""Render review templates offline: python3 terraform/bootstrap/policies.py dev.

Never creates roles or contacts AWS. Placeholder ARNs deliberately fail closed.
Infrastructure bootstrap/expansion is separately reviewed; do not attach an
administrator policy when a missing provider permission is discovered.
"""
import json
import sys


def templates(env):
    if env not in ('dev', 'prod'):
        raise ValueError('Select dev/prod explicitly')
    account = '225319921763'
    bucket = f'arn:aws:s3:::foom-site-{env}-{account}-us-west-2'
    state = f'arn:aws:s3:::terraform-state-xxx/foom-site/{env}/terraform.tfstate'
    domain = 'dev.foom-term.com' if env == 'dev' else 'foom-term.com'
    subject = 'pull_request' if env == 'dev' else 'ref:refs/heads/main'

    def allow(sid, action, resource, condition=None):
        value = dict(Sid=sid, Effect='Allow', Action=action, Resource=resource)
        if condition:
            value['Condition'] = condition
        return value

    def policy(statements):
        return dict(Version='2012-10-17', Statement=statements)

    trust = policy([dict(Effect='Allow', Principal=dict(Federated=
        f'arn:aws:iam::{account}:oidc-provider/token.actions.githubusercontent.com'),
        Action='sts:AssumeRoleWithWebIdentity', Condition={'StringEquals': {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
            'token.actions.githubusercontent.com:sub':
                f'repo:scott-r-lindsey@457016/foom-site@1421149044:{subject}'}})])
    publication = policy([
        allow('ListOwnBucket', ['s3:ListBucket'], bucket),
        allow('ReadWriteOwnObjects', ['s3:GetObject', 's3:PutObject'], bucket + '/*'),
        # Delete only documents: assets and retained archives are never cleaned up.
        allow('RemoveDocuments', ['s3:DeleteObject'],
              [bucket + '/*' + suffix for suffix in ('.html', '.txt', '.xml', '.json', '.webmanifest')]),
        allow('ProtectJournalAndArchives', [], bucket),
        allow('OwnInvalidations', ['cloudfront:CreateInvalidation', 'cloudfront:GetInvalidation'],
              f'arn:aws:cloudfront::{account}:distribution/REPLACE_{env.upper()}_DISTRIBUTION_ID'),
    ])
    # Explicit deny is independent of extension-based document delete allow.
    publication['Statement'][3] = dict(Sid='NeverDeleteReleaseHistory', Effect='Deny',
                                      Action=['s3:DeleteObject', 's3:DeleteObjectVersion'],
                                      Resource=bucket + '/_releases/*')
    backend = policy([
        allow('BackendLocation', ['s3:GetBucketLocation'], 'arn:aws:s3:::terraform-state-xxx'),
        allow('OwnBackendPrefix', ['s3:ListBucket'], 'arn:aws:s3:::terraform-state-xxx',
              {'StringLike': {'s3:prefix': [f'foom-site/{env}/*']}}),
        allow('OwnState', ['s3:GetObject', 's3:PutObject'], state),
        allow('OwnLock', ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'], state + '.tflock'),
    ])
    # Existing-resource maintenance template. Initial creates and unsupported
    # resource-level CloudFront policies are deliberately omitted: bootstrap owner
    # must provision/review those with separate administrative authorization.
    infrastructure = policy([
        allow('OwnBucketConfiguration', [
            's3:GetBucketPolicy', 's3:PutBucketPolicy', 's3:GetBucketPublicAccessBlock',
            's3:PutBucketPublicAccessBlock', 's3:GetBucketOwnershipControls',
            's3:PutBucketOwnershipControls', 's3:GetEncryptionConfiguration',
            's3:PutEncryptionConfiguration', 's3:GetBucketVersioning', 's3:PutBucketVersioning',
            's3:GetBucketTagging', 's3:PutBucketTagging', 's3:GetBucketLocation',
            's3:GetBucketAcl', 's3:GetBucketCORS', 's3:GetBucketWebsite',
            's3:GetBucketLogging', 's3:GetAccelerateConfiguration',
            's3:GetReplicationConfiguration', 's3:GetLifecycleConfiguration',
            's3:GetBucketObjectLockConfiguration', 's3:GetBucketRequestPayment'], bucket),
        allow('OwnDistribution', ['cloudfront:GetDistribution', 'cloudfront:GetDistributionConfig',
                                  'cloudfront:UpdateDistribution', 'cloudfront:ListTagsForResource',
                                  'cloudfront:TagResource', 'cloudfront:UntagResource'],
              f'arn:aws:cloudfront::{account}:distribution/REPLACE_{env.upper()}_DISTRIBUTION_ID'),
        allow('OwnFunction', ['cloudfront:DescribeFunction', 'cloudfront:GetFunction',
                              'cloudfront:UpdateFunction', 'cloudfront:PublishFunction'],
              f'arn:aws:cloudfront::{account}:function/foom-site-{env}'),
        allow('OwnCertificate', ['acm:DescribeCertificate', 'acm:ListTagsForCertificate',
                                 'acm:AddTagsToCertificate', 'acm:RemoveTagsFromCertificate'],
              f'arn:aws:acm:us-east-1:{account}:certificate/REPLACE_{env.upper()}_CERTIFICATE_ID'),
        allow('ZoneRead', ['route53:GetHostedZone', 'route53:ListResourceRecordSets'],
              'arn:aws:route53:::hostedzone/Z0451547IUIBRZP42UO4'),
        allow('OwnAlias', ['route53:ChangeResourceRecordSets'],
              'arn:aws:route53:::hostedzone/Z0451547IUIBRZP42UO4',
              {'ForAllValues:StringEquals': {
                  'route53:ChangeResourceRecordSetsNormalizedRecordNames': [domain],
                  'route53:ChangeResourceRecordSetsRecordTypes': ['A', 'AAAA']}}),
    ])
    return dict(trust=trust, publication=publication, backend=backend,
                infrastructureMaintenanceReview=infrastructure)


if __name__ == '__main__':
    print(json.dumps(templates(sys.argv[1]), indent=2))
