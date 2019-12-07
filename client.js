#!/usr/bin/env node
// Imports/Dependencies
const WebSocket = require('ws');
const exec = require('child_process').exec;
const ENV = process.env;

const ws = new WebSocket(ENV.WS_SERVER);

ws.on('open', () => {
  ws.send(`{ENV.NAME} has connected.`);
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
  const start = Now();
  console.log('scanning...');
  exec(cmd, (err, out) => {
    const t = parseInt(Now() - start);
    if (err) return r({ err, out, t });
    r({ err, out, t }); 
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
  while (mark > c) {
    if (now > end) {
      c += now - end;
      end = now;
    } else {
     now = Now(); 
    }
  }

  console.log('off: ', offset, 'now: ', now, ' end: ', end, ' st: ', d.serverTime, d.execT, 'c: ', c, '\nmark: ', mark);
  const calcLag = parseInt(c) - mark;
  const startedAt = new Date().getTime();
  const cmd = 'rtl_power -f 153084000:153304000:0.8k -g 35 -i 0 -e -1 2>&1';
  const raw = await sample(cmd);
  const { err, out, t} = raw;

  const res = {
    name: ENV.NAME,
    msg: 'Sampling done!',
    calcLag,
    startTime: unixTS, 
    samplingTime: {
      unit: 'ns',
      t
    },
    startedAt,
    data: err ? null : out,
    error: err ? 'error...' : null,
    timestamp: new Date().getTime()
  };


  console.log('complete!');
  ws.send(JSON.stringify(res));
});

