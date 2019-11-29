#!/usr/bin/env node
// Imports/Dependencies
const stdin = process.openStdin();
const timesync = require('timesync');
const axios = require('axios');
const exec = require('child_process').exec;
const Peer = require('peerjs-nodejs');

// Command saved as var...
const rtlPowerCMD = 'sudo rtl_power -f 100M:100.3M:0.3k -g 35 -1'; 

const ts = timesync.create({
  interval: 10000,
  peers: []
});

let doSampling = true;

// EXECUTE RTL_POWER  
// ===============================================================
const getSDRData = (cmd) => new Promise((resolve) => {
  exec(cmd, (err, stdout) => {
    if (err) return resolve(err); 
    console.log(typeof stdout);
    resolve(stdout);
  });
});

// ON TIME SYNC
// ===============================================================
ts.on('sync', async (state) => {
  console.log('onSync state: ', state);
  if (state === 'start') {
    
    /*
    ts.options.peers = openConnections();
    console.log('syncing with peers: ', ts.options.peers); 
    if (ts.options.peers.length) {
      console.log('syncing with: ', ts.options.peers);
    }
    /*
    const data = await getSDRData(rtlPowerCMD);
    if (typeof data === 'string') {
      const freqs = data.split(',').splice(6);
      console.log('freqs: ', freqs.length);
    }
    */
  }
});

ts.on('change', (offset) => {
  console.log('offSet, change: ', offset); 
});

ts.send = (id, data, timeout) => {
  console.log('send: ', id, data, timeout);
};

// initiating peer 
const peer = new Peer('NAME', {
  key: 'lwjd5qra8257b9',
  debug: 1,
  host: '192.168.10.242',
});

console.log('peer -> ', peer);
//var id = 'asd'
//var peer = new Peer(id, {key: 'lwjd5qra8257b9', debug: 1});

/*
peer.on('open', connectToPeers);
peer.on('connection', setupConnection);
*/

const openConnections = () => {
    return Object.keys(peer.connections).filter(function (id) {
      return peer.connections[id].some(function (conn) {
        return conn.open;
      });
    });
  }

const connectToPeers = () => {
    peers.filter(function (id) {
      return peer.connections[id] === undefined;
    }).forEach(function (id) {
      const conn = peer.connect(id);
      console.log('connecting with ' + id + '...');
      setupConnection(conn);
  });
}

const setupConnection = (conn) => {
  conn.on('open', function () {
    console.log('connected with ' + conn.peer);
  })
  .on('data', function(data) {
    console.log('receive', conn.peer, data);
    ts.receive(conn.peer, data);
  })
  .on('close', function () {
    console.log('disconnected from ' + conn.peer);
  })
  .on('error', function (err) {
    console.log('Error', err);
  });
}

// Event handlers, executes function on 'data' event
/*
stdin.on('data', (raw) =>{
  console.log('data',raw.toString())
  const convertedData = raw.toString()
  // http headers
  const headers = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const data = {
    name: 'RX1_BLACK_PI',
    iq: convertedData
  };

  // post request using axios to the server
  if (doSampling) {
    doSampling = false;
    axios.post("http://192.168.10.242:3010/rtldata", data, headers)
    .then(function (response) {
      console.log('res: ', response.data);
      doSampling = true;
    })
    .catch(function (error) {
      console.log(error);
    });
  }
});
*/

