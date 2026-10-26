'use strict';
const assert = require('node:assert/strict');
const dgram = require('node:dgram');
const { Receiver } = require('../src/receiver.cjs');
const path = require('node:path');
(async () => {
 const receiver=new Receiver(path.resolve(__dirname,'..'));
 const socket=dgram.createSocket({type:'udp4',reuseAddr:true});
 let timer,interval;
 try {
  await new Promise((resolve,reject)=>{socket.once('error',reject);socket.bind(5353,resolve);});
  socket.addMembership('224.0.0.251');socket.setMulticastLoopback(true);
  const heard=new Promise((resolve,reject)=>{
   socket.on('message',data=>{const text=data.toString('latin1');if(text.includes('Mediaprompter')&&text.includes('_airplay'))resolve();});
   timer=setTimeout(()=>reject(Error('No local AirPlay mDNS advertisement received')),9000);
  });
  await receiver.start();
  const labels=['_airplay','_tcp','local'];
  const name=Buffer.concat(labels.map(l=>Buffer.concat([Buffer.from([l.length]),Buffer.from(l)])));
  const query=Buffer.concat([Buffer.from([0,0,0,0,0,1,0,0,0,0,0,0]),name,Buffer.from([0,0,12,0,1])]);
  interval=setInterval(()=>socket.send(query,5353,'224.0.0.251'),1000);
  await heard;assert.notEqual(receiver.status.state,'error');
  console.log('PASS: Mediaprompter advertises an AirPlay service on the local network');
 } finally {clearTimeout(timer);clearInterval(interval);socket.close();receiver.stop();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
