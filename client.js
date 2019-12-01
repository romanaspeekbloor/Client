#!/usr/bin/env node
// Imports/Dependencies
const WebSocket = require('ws');
const exec = require('child_process').exec;

const ws = new WebSocket('ws://192.168.10.242:9000');
var _conT = 0;
var _date = new Date();


const convertNs = (t, ns) => {
  const units = ({
    ns: ns,
    micro: ns / 1000,
    ms: ns / 1000000,
  });
  // TODO check if possible to convert to max int
  return Math.round(units[t]);
};

const Now = () => process.hrtime.bigint();

const sample = (cmd) => new Promise(r => {
  console.log('scanning...');
  exec(cmd, (err, out) => {
    if (err) return r({ err, out });
    r({ err, out }); 
  });
});

const SetRXTime = (data) => {
  console.log({ data });
  const lag = convertNs('ms', parseInt(Now() - _conT));
  _date.setTime(data.timestamp - lag);
  console.log({ lag });
  if (data.timestamp) console.log('got ts'); 
};

const check = (msg) => {
  if (!msg.actions) return console.log('no action found');
  const { actions, params, ...data } = msg;
  if (params) data.params = params
  const tasks = {
    setTime: SetRXTime(data)
  }
  return ({

  });
}

// TODO something like router and route to function depending on events
ws.on('open', () => {
  _conT = Now();
  ws.send('RX3 connected');
});

ws.on('message', async (msg) => {
  const d = JSON.parse(msg);
  if (d.actions) return check(d);
  let unixTS = new Date().getTime();
  let now = Now();
  let end = now; 
  let c = 0n;
  const offset = unixTS - d.serverTime;
  const mark = (d.execT - offset) * 1000000;
  // const delay = await new Promise(r => setTimeout(r, d.execT - t));
  for (;mark > c;) {
    if (end < now) { 
      c += now - end;
      end = now;
    } else {
      now = Now();
    }
  }
  console.log('off: ', offset, 'now: ', now, ' st: ', d.serverTime, d.execT, ' ts: ', unixTS, 'c: ', c);
  const startedAt = new Date().getTime();
  const cmd = 'rtl_power -f 153084000:153304000:0.8k -g 35 -i 0 -e -1 2>&1';
  const raw = await sample(cmd);
  const { err, out } = raw;
  const samplingTime = convertNs('micro', parseInt(Now() - now));

  const res = {
    name: 'RX 3',
    msg: 'Sampling done!',
    startTime: unixTS, 
    startedAt, 
    samplingTime, 
    data: err ? null : out,
    error: err ? 'error...' : null,
    timestamp: new Date().getTime()
  };


  console.log('complete!');
  ws.send(JSON.stringify(res));
});

