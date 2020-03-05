#!/usr/bin/env node
// Imports/Dependencies
const io = require('socket.io-client')('http://192.168.10.242:9955');
const exec = require('child_process').exec;
const usb = require('usb');
const convertHR = require('convert-hrtime');
const ENV = process.env;

let _clientDelay = 100000000;

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
  exec(cmd, (err, out) => {
    const t = parseInt(Now() - start);
    if (err) return r({ err, out, t });
    r({ err, out, t }); 
  });
});

// Events 
// =====================================================
io.on('connect', () => {
  // TODO dynamically pull details from hardware
  // - include usbAddress
  const clientConfig = {
    device_type: 'rx',
    device_name: ENV.NAME,
    device_model: 'PI 3',
    device_make: 'raspberry',
  };
  io.emit('onClientConnect', ENV.NAME, clientConfig);
});

io.on('setClient', (config) => {
  // TODO client configuration 'init'
  console.log({ config });
});

// New way of calculating offset
const NowHR = () => process.hrtime();
const DiffHR = (t) => convertHR(process.hrtime(t)).nanoseconds;

// getSamples event handler
io.on('getSamples', async (d) => {
  if (!d.data.length) return io.emit('getSamples', JSON.stringify('yo'));
//  await new Promise(r => setTimeout(r, 25));
  let now = Now(), c = 0n;
  // Check request and filter by name
  const req = d.data ? d.data.filter(d => d.name === ENV.NAME)[0] : null;

  // Calculate offset (latency)
  let offset = req && req.benchMark ? DiffHR(req.benchMark) : (new Date().getTime() - d.serverTime) * 1000000;

  if (req && req.benchMark) offset -= 7000000000;
  if (req && req.ingestT) offset -= req.ingestT;
  
  let end = Now();

  // Have a bit of delay for compensation
  while (_clientDelay - offset >= c) {
    if (now > end) {
      c += now - end;
      end = now;
    } else { 
      now = Now(); 
    }
  }


  console.log('server time: ', d.serverTime, Math.floor(parseInt(c) / 1000000));
  console.log({ c, offset, req });
  const cmd = 'rtl_power -f 88184000:88204000:0.1k -g 80 -i 0 -e -1 2>&1';
  const raw = await sample(cmd);
  const { err, out, t} = raw;

  const res = {
    name: ENV.NAME,
    msg: 'Sampling done!',
    elapsed: c.toString(),
    samplingTime: {
      ns: t,
      us: t / 1000,
      ms: t / 1000000,
    },
    data: err ? null : out,
    error: err ? 'error...' : null,
    timestamp: new Date().getTime(),
    benchMark: NowHR()
  };

  io.emit('getSamples', JSON.stringify(res));
});

