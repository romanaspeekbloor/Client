#!/usr/bin/env node
// Imports/Dependencies
const io = require('socket.io-client')('http://192.168.10.242:9955');
const exec = require('child_process').exec;
const usb = require('usb');
const ENV = process.env;

/**
 * get usb device address
 * id: {string/number} device vendorId (got to be in decimal)
 */
const getUSBAddress = (id) => {
  const details = usb.getDeviceList().filter(u => u.deviceDescriptor.idVendor === id)[0];
  let addr = details.deviceAddress;
  return (addr >= 10) ? `0${addr}` : `00${addr}`;
};

console.log(getUSBAddress(3034));

const convertNs = (t, ns) => {
  if (typeof ns === 'string') ns = BigInt(ns);
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

// Events 
// =====================================================
io.on('connect', () => {
  io.emit('onClientConnect', ENV.NAME, `${ENV.NAME} has connected.`);
});

io.on('setClient', (config) => {
  // TODO client configuration 'init'
  console.log({ config });
});

// getSamples event handler
io.on('getSamples', async (d) => {
  // TODO d validation, emit event on error
  let now = Now(), c = 0n;
  const offset = (new Date().getTime() - d.serverTime) * 1000000;
  let end = now;

  while (offset >= c) {
    if (now > end) {
      c += now - end;
      end = now;
    }
    now = Now(); 
  }

  const startedAt = d.serverTime + parseInt(c / 1000000n, 10);
  console.log('off: ', offset, 'now: ', now, ' end: ', end, ' st: ', 'c: ', c / 1000000n);
  const cmd = 'rtl_power -f 153084000:153304000:0.8k -g 35 -i 0 -e -1 2>&1';
  const raw = await sample(cmd);
  const { err, out, t} = raw;

  const newBenchMark = Now().toString();

  const res = {
    name: ENV.NAME,
    msg: 'Sampling done!',
    samplingTime: {
      unit: 'ns',
      time: (Now() - now).toString() 
    },
    startedAt,
    data: err ? null : out,
    error: err ? 'error...' : null,
    timestamp: new Date().getTime(),
    benchMark: newBenchMark
  };

  io.emit('getSamples', JSON.stringify(res));
});

