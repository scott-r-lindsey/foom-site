// Executed unchanged by CloudFront and the offline VM tests.
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  // Reject ambiguous paths before constructing a same-origin Location header.
  if (
    !/^\/(?!\/)/.test(uri) ||
    /[\\\s?#]/.test(uri) ||
    /%(?:2f|5c|0[ad])/i.test(uri)
  ) {
    return { statusCode: 400, statusDescription: 'Bad Request' };
  }
  if (uri.includes('//') || /(?:^|\/)(?:\.|%2e){1,2}(?:\/|$)/i.test(uri)) {
    return { statusCode: 400, statusDescription: 'Bad Request' };
  }
  var target;
  if (uri.endsWith('/index.html')) target = uri.slice(0, -10);
  else if (!uri.endsWith('/') && !uri.split('/').pop().includes('.'))
    target = uri + '/';
  if (target) {
    var pairs = [];
    Object.keys(request.querystring).forEach(function (key) {
      var item = request.querystring[key];
      (item.multiValue || [item]).forEach(function (value) {
        pairs.push(key + '=' + value.value);
      });
    });
    return {
      statusCode: 308,
      statusDescription: 'Permanent Redirect',
      headers: {
        location: {
          value: target + (pairs.length ? '?' + pairs.join('&') : ''),
        },
        'cache-control': { value: 'public, max-age=0, must-revalidate' },
      },
    };
  }
  if (uri.endsWith('/')) request.uri += 'index.html';
  return request;
}
