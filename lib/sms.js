var Iconv  = require('iconv').Iconv;
var common  = require('./common');

exports.sms = function(connect, options) {
  var self = this;
	self.connect = connect;
	self.toucs = new Iconv('UTF-8', 'UCS-2');
	self.options = {
		use_message_payload:false,
		esm_class_for_multipart:67,
		registered_delivery:true,
		link_sequence_to_remote:true,
		pdu_opt:false,
		pdu_opt_extended:false,
		sequence_id:false,
		max_part_in_one_message: 10
	};
	
	if(typeof(options) == 'object') {
		for(var _i in options) {
			self.options[_i] = options[_i];
		}
	} 
	
	self.send = function(sender,phone,message) {
		var sequence = (self.options.sequence_id)? self.options.sequence_id : self.connect.getSeqNum();
		var params = {source_addr:sender, destination_addr:phone, sequence_number:sequence};
		var extended = {};
		var messageCoding = self.detect_message_coding(message);
		params.data_coding = messageCoding;
		params.registered_delivery = (self.options.registered_delivery)? 1 : 0;
		
		if(typeof(self.options.pdu_opt) == 'object') {
			for(var _n in self.options.pdu_opt) {
				params[_n] = self.options.pdu_opt[_n];
			}
		}
		
		if(typeof(self.options.pdu_opt_extended) == 'object') {
			for(var _n in self.options.pdu_opt_extended) {
				extended[_n] = self.options.pdu_opt_extended[_n];
			}
		}
		
		if(self.options.use_message_payload) {
			params.sm_length = 0;
			params.short_message = '';
			params.esm_class = 3;
			extended.message_payload = (messageCoding === 0)? message : self.toucs.convert(message).toString();
			self.connect.sendMessage(params, extended);
		} else {
			var messages = self.split_message(message);
			
			if(messages === false) {
				params.short_message = (messageCoding === 0)? message : self.toucs.convert(message).toString();
				params.esm_class = 3;
				self.connect.sendMessage(params, extended);
			} else {
				if(typeof(messages) == 'array' || typeof(messages) == 'object') {
					for(var _m in messages) {
						var _param = common.clone(params);
						var _extended = common.clone(extended);
						
						_param.short_message = messages[_m].text_with_udh;
						_param.esm_class = self.options.esm_class_for_multipart;

						self.connect.sendMessage(_param, _extended);
					}
				}
			}
		}
	};
	
	self.split_message = function(message) {
		var is_multibite = (self.detect_message_coding(message.toString()) == 8)? true : false;
		var max_part_size = (is_multibite)? 134 : 154;
	    var max_one_part_size = (is_multibite)? 140 : 160;  
	    
	    if(is_multibite) message = self.toucs.convert(message.toString()).toString();
	    if(message.length <= max_one_part_size) return false;
	    
	    var _parts_count = Math.ceil(message.length / max_part_size);
	    var _pos = 0;
        var _part_no = 1;
        var _out = new Array();
        var _ref = Math.floor(Math.random()*128)+1;
        
        while (_pos < message.length) {
    		if(_part_no >= self.max_part_in_one_message) break;   		
    		var _text_cut = message.toString().substr(_pos, max_part_size);
    		_out.push({
    			text:_text_cut,
    			part:_part_no,
    			parts:_parts_count,
    			ref:_ref,
    			text_with_udh: self.get_text_with_udh(_text_cut, _parts_count, _part_no,_ref)
    		});
   		
    		_pos += _text_cut.length;
    		_part_no++;
    		
    		delete _text_cut;
        }
        
        return _out;
	};
	
	self.detect_message_coding = function(message) {
		return (/[^(\x20-\x7F\n\r)]+/.test(message))? 8 : 0;
	};

	self.get_text_with_udh = function(message, parts_count, part_num, ref) {
		var udh = new Buffer(6+message.length);
		var messageBuffer = new Buffer(message);
		
		udh.writeUInt8(5,0);
		udh.writeUInt8(0,1);
		udh.writeUInt8(3,2);
		udh.writeUInt8(ref,3);
		udh.writeUInt8(parts_count,4); 
		udh.writeUInt8(part_num,5);
		messageBuffer.copy(udh, 6);
		
		return udh;
	};
};
