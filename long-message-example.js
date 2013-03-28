var sys = require('util');
var shorty = require('./lib/shorty');
var smsModel = require('./lib/sms').sms;
var smsclient = shorty.createClient('./conf/smpp.conf');

smsclient.on('bindSuccess', function(pdu) {
  console.log('Bind success');
  var sms = new smsModel(smsclient, {sequence_id:154645, use_message_payload:false});
  // utf-8 message
  sms.send('enotice', '79257559544', 'Hello УТФ 8!');
  // long message
  sms.send('enotice', '79257559544', 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam');
});

smsclient.connect();











var sighandle = function() {
    process.stdin.end();
    smsclient.unbind();
    process.exit();
};

process.on('SIGHUP', sighandle);
process.on('SIGINT', sighandle);
process.on('SIGQUIT', sighandle);
process.on('SIGTERM', sighandle);
