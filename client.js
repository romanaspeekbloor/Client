#!/usr/bin/env node
// Imports/Dependencies
const WebSocket = require('ws');
const exec = require('child_process').exec;

const ws = new WebSocket('ws://192.168.10.242:9000');

ws.on('open', () => {
  ws.send('RX4 connected');
});

const convertNs = (t, ns) => {
  const units = ({
    ns: ns,
    micro: ns / 1000,
    ms: ns / 1000000,
  });
  // TODO check if possible to convert to max int
  return parseInt(units[t]);
};

const Now = () => process.hrtime.bigint();

const sample = (cmd) => new Promise(r => {
  console.log('scanning...');
  exec(cmd, (err, out) => {
    if (err) return r({ err, out });
    r({ err, out }); 
  });
});

ws.on('message', async (msg) => {
  const d = JSON.parse(msg);
  const unixTS = new Date().getTime();
  let now = Now();
  let c = 0n;
  const offset = unixTS - d.serverTime;
  const mark = (d.execT - offset) * 1000000;
  // const delay = await new Promise(r => setTimeout(r, d.execT - t));
  let end = now;;
  for (;mark > c;) {
    if (now > end) {
      c += now - end;
      end = now;
    } else {
     now = Now(); 
    }
  }

  console.log('off: ', offset, 'now: ', now, ' end: ', end, ' st: ', d.serverTime, d.execT, 'c: ', c, '\nmark: ', mark);
  const startedAt = new Date().getTime();
  const cmd = 'rtl_power -f 153084000:153304000:0.8k -g 35 -i 0 -e -1 2>&1';
  const raw = await sample(cmd);
  const { err, out } = raw;
  const samplingTime = convertNs('micro', parseInt(Now() - now));

  const res = {
    name: 'RX 4',
    msg: 'Sampling done!',
    startTime: unixTS, 
    samplingTime,
    startedAt,
    data: err ? null : out,
    error: err ? 'error...' : null,
    timestamp: new Date().getTime()
  };


  console.log('complete!');
  ws.send(JSON.stringify(res));
});

