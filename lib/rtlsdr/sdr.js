'use strict'

var rtlsdr = require('rtl-sdr')

const deviceIndex = 0

// Correction value in parts per million (ppm) to use in frequency
// correction
const ppmCorrection = 0
// Set center frequency to tune to
const freq = 90 * 1000000
// Set center frequency to tune to
// const sampleRate = 2e6
const sampleRate = 1000000

// Output buffers used with get_device_usb_strings
const vendor = Buffer.alloc(256)
const product = Buffer.alloc(256)
const serial = Buffer.alloc(256)

const deviceCount = rtlsdr.get_device_count()
if (!deviceCount) {
  console.log('No supported RTLSDR devices found.')
  process.exit(1)
}

rtlsdr.get_device_usb_strings(0, vendor, product, serial)

const dev = rtlsdr.open(deviceIndex)

rtlsdr.set_tuner_gain_mode(dev, 1)
// Set the frequency correction value for the device
rtlsdr.set_freq_correction(dev, ppmCorrection)

// Tune center frequency
rtlsdr.set_center_freq(dev, freq)

// Select sample rate
rtlsdr.set_sample_rate(dev, sampleRate)

const gains = new Int32Array(100)

// Populate the gains array and get the actual number of different
// gains available. This number will be less than the actual size of
// the array:
const numgains = rtlsdr.get_tuner_gains(dev, gains)
console.log(numgains);

const gain = gains[numgains - 1]

rtlsdr.set_tuner_gain(dev, gain)


// Reset the internal buffer
rtlsdr.reset_buffer(dev)

// Start reading data from the device:
//
// bufNum: optional buffer count, bufNum * bufLen = overall buffer size
//         set to 0 for default buffer count (15)
//
// bufLen: optional buffer length, must be multiple of 512, should be a
//         multiple of 16384 (URB size), set to 0 for default buffer
//         length (2^18)
const bufNum = 10
const bufLen = 512

rtlsdr.read_async(dev, onData, onEnd, bufNum, bufLen)

let c = 0;

const fs = require('fs');
let sum = 0
const every = 500
function onData (data, size) {
	const iqData = processIQ(data)
	const powers = iqData.map(complexDB)

  let power;
  try {
    power = powers.reduce((a ,c) => a + c) / powers.length;
  } catch(e) {
    console.log('ERROR: ', data)
  }

  c++;
  sum += power
  if (c > every) {
    console.log(new Date(), sum/every)
    c = 0
    sum = 0
  }
}

function complex(i, q) {
	return {i, q}
}

function complexLength(o) {
  return Math.sqrt(o.i ** 2 + o.q ** 2)
}

function complexDB(o) {
  return 10 * Math.log10(10 * (o.i ** 2 + o.q ** 2))
}

function processIQ (data) {
	console.assert(data.length % 2 === 0);
	const r = []
	for (var p = 0; p < data.length; p += 2) {
		const i = data.readInt8(p)
		const q = data.readInt8(p + 1)
		r.push(complex(i/(255/2) - 1, q/(255/2) - 1))
	}
	return r
}

function onEnd () {
  console.log('onEnd')
}
