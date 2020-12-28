const SockJS = require('sockjs-client');

class Slobs
{
  constructor()
  {
    this.socket = new SockJS('http://127.0.0.1:59650/api');
    this.nextRequestId = 1;
    this.requests = { };
    this.connected = false;

    this.socket.onopen = () => {
      this.request('TcpServerService', 'auth', process.env.SLOBS_TOKEN)
        .then(() => {
          this.connected = true;
          this.request('ScenesService', 'getScenes')
            .then(scenes => {
              this.scene = scenes[0];
              this.wateringAlertResourceId = this.scene.nodes.find(obj => {
                return obj.name == 'Watering Alert';
              }).resourceId;
            })
        });
    }

    this.socket.onmessage = e => {
      this.onMessageHandler(e.data);
      console.log('LogResponse', e.data.toString());
    }
  }

  setWateringAlertVisibility(visibility)
  {
    return this.request(this.wateringAlertResourceId, 'setVisibility', visibility);
  }

  request(resourceId, method, ...args)
  {
    const id = this.nextRequestId++;
    const requestBody = {
      jsonrpc: '2.0',
      id: id,
      method: method,
      params: {
        resource: resourceId,
        args
      }
    }

    return new Promise((resolve, reject) => {
      this.requests[id] = {
        body: requestBody,
        resolve: resolve,
        reject: reject
      }

      this.socket.send(JSON.stringify(requestBody));
    });
  }

  onMessageHandler(data)
  {
    const message = JSON.parse(data);
    const request = this.requests[message.id];

    if (request)
    {
      if (message.error)
      {
        request.reject(message.error);
      }
      else
      {
        request.resolve(message.result);
      }
      delete this.requests[message.id];
    }
  }

}

module.exports = Slobs;