#!/usr/bin/env node
// Imports/Dependencies
const WebSocket = require('ws');
const exec = require('child_process').exec;
const ENV = process.env;

const ws = new WebSocket(ENV.WS_SERVER);

ws.on('open', () => {
  ws.send(`${ENV.NAME} has connected.`);
});

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
  const start = Now();
  console.log('scanning...');
  exec(cmd, (err, out) => {
    const t = parseInt(Now() - start);
    if (err) return r({ err, out, t });
    r({ err, out, t }); 
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
  if (d.actions) {
    // TODO actions
    return console.log('actions:' , d.actions, { d });
  }
  const unixTS = new Date().getTime();
  let now = Now();
  let c = 0n;
  const offset = unixTS - d.serverTime;
  const mark = (d.execT - offset) * 1000000;
  let end = now;;

  while (mark >= c) {
    if (now > end) {
      c += now - end;
      end = now;
    }
    now = Now(); 
  }

  console.log('off: ', offset, 'now: ', now, ' end: ', end, ' st: ', d.serverTime, d.execT, 'c: ', c, '\nmark: ', mark);
  const execOffset = parseInt(c) - mark;
  const startedAt = new Date().getTime();
  const cmd = 'rtl_power -f 153084000:153304000:0.8k -g 35 -i 0 -e -1 2>&1';
  const raw = await sample(cmd);
  const { err, out, t} = raw;

  const res = {
    name: ENV.NAME,
    msg: 'Sampling done!',
    execOffset,
    startTime: unixTS, 
    samplingTime: {
      unit: 'ns',
      time: t - execOffset
    },
    startedAt,
    data: err ? null : out,
    error: err ? 'error...' : null,
    timestamp: new Date().getTime()
  };

  ws.send(JSON.stringify(res));
});

