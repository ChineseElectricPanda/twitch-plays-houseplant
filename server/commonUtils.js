function SetTimeoutPromise(timeout)
{
  return new Promise((resolve, reject) => {
    setTimeout(() => { resolve(); }, timeout);
  });
}

module.exports = { SetTimeoutPromise };