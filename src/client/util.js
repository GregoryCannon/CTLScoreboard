const getApiUrl = suffix => {
  return import.meta.env.VITE_API_BASE + suffix;
}

async function makeHttpRequest(methodStr, localUrl, body) {
  const response = await fetch(getApiUrl(localUrl), {
    method: methodStr,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  return response.json();
}

export {
  getApiUrl,
  makeHttpRequest
};