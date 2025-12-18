/** Acts like console.log, but formats with a custom prefix */
function log() {
  const PREFIX = " -- ";

  // Log the arguments of this function with the added prefix
  var args = Array.prototype.slice.call(arguments);
  args.unshift(PREFIX);
  console.log.apply(console, args);
}

/** Logs an incoming request with its body. */
function logRequest(description, requestBody) {
  console.log("\n(REQUEST):", description, "\n", requestBody);
}

/** Logs an outgoing response with its body. */
function logResponse(description, responseBody) {
  console.log("(RESPONSE):", description, "\n", responseBody);
}

/** Logs a description of what the server is sending in an outgoing response, without logging the request body. (Used for large responses). */
function logResponseDescription(description) {
  console.log("(RESPONSE):", description);
}

module.exports = {
  log,
  logRequest,
  logResponse,
  logResponseDescription
};
