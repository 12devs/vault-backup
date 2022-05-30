const logAxiosError = (err) => {
  const { response } = err;
  console.log(err);
  console.log(response);
  const { request, ...errorObject } = response; // take everything but 'request'

  console.log('request:');
  console.log(errorObject.config);

  delete errorObject.config

  console.log('response:');
  console.log(errorObject);
}

const sleep = (time) => new Promise((resolve, _) => setTimeout(resolve, time))

module.exports = {
  sleep,
  logAxiosError
}
