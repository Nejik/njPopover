/*!
 * njPopover ajax addon - v0.1
 * nejikrofl@gmail.com
 * Copyright (c) 2015 N.J.
*/

njPopover.a.extended = true;

njPopover.defaults.load = 'loading...';//(html) html of element that will be used as content for loading status
njPopover.defaults.timeout = 10000;//(number) ajax timeout
// njPopover.defaults.ajaxHandler = function() {}//(function) callback that will be fired when ajax complete

njPopover.defaults.imgs = '[data-njp-img]';//(boolean false || selector) if imgs selector is presented, plugin will find images matches to this selector in popover, and wait until they begin downloading(to know it's size), only than show popover 


njPopover.prototype.ajax = function (url) {
	if(!url) this._error('njPopover, you should specify url.');


	var o = this.o,
		that = this;

	
	if(url === 'stop') {
		if(!this._o.xhr) this._error('njPopover, there is no active ajax request.');
		if(!this._o.xhr) return;
		delete this._o.loading;
		that._o.xhr.aborted = true;//needed for disable error handler
		that._o.xhr.abort();
		return;
	}
	
	this.loading('on');

	// if(this._o.state !== 'inited' && this._o.state !== 'show' && this._o.state !== 'shown') {
	// 	this._error('njPopover, ajax can be used only on shown popover.');
	// }


	this._o.xhr = new(XMLHttpRequest || ActiveXObject)("Microsoft.XMLHTTP");

	function onabort() {
		that._insertContent('njPopover, ajax abort/timeout.','text');
		that.position();
		ajax_clear();
	}
	this._o.xhr.onabort = onabort;
	
	function onerror() {
		if(this.aborted) return;
		that._insertContent('njPopover, ajax error.','text');
		that.position();

		ajax_clear();
	}
	this._o.xhr.onerror = onerror;

	this._o.xhr.ajax_timeout = function () {
		console.log('ajax - timeout')
		clearTimeout(that._o.xhrTimeout);

		that.ajax('stop');
	}

	this._o.xhrTimeout = setTimeout( this._o.xhr.ajax_timeout, o.timeout);

	var response;

	this._o.xhr.onreadystatechange = function () {
		if(this.aborted) {
			// onabort();//for ie <=9, for some reason it not fires automatically
			clearTimeout(that._o.xhrTimeout);
			return;
		}

		if(this.readyState === 4) {
			if(this.status == 200) {
				clearTimeout(that._o.xhrTimeout);

				if(o.ajaxHandler) {
					var t = {
						data: this.responseText,
						xhr: this
					};
					if(o.ajaxHandler) {
						o.ajaxHandler.call(that, t, that)
					}

					response = t.data;
				} else {
					response = this.responseText;
				}
				that._cb('ajaxReady');
				that._o.content = response;
				that.loading('off', that._o.content, 'html');
			} else {
				this.ajax_error();
			}
		}
	}

	if(this._o.xhr) {
		this._o.xhr.open("GET", url, true);
		this._o.xhr.send(null);
	}


	function ajax_clear() {
		if(!that._o.xhr) return;

		
		clearTimeout(that._o.xhrTimeout);

		delete that._o.xhr;
		delete that._o.xhrTimeout;
	}

	return this;
}

njPopover.prototype.loading = function (state, content, type) {
	var o = this.o;

	if(!state) this._error('njPopover, you should set state mode(on || off)');

	switch(state) {
	case 'on':
		if(this._o.loading) this._error('njPopover, popover already in loading state.');

		if(this._o.state === 'inited') this.show();//show popover if it is hidden

		if(!o.load) this._error('njPopover, you do not specify the content for inserting and o.load option is false.');
		this.v.popover.html(o.load);

		this.position();

		this._cb('loading');
	break;
	case 'off':
		if(!this._o.loading) this._error('njPopover, popover not in loading state.');


		if(content) {
			this._insertContent(content, type);
		} else if(this._o.contentEl) {//return orig content
			this.v.popover.html('');
			this.v.popover.append(this._o.contentEl);
		} else if(this._o.content) {
			this.v.popover.html(this._o.content);
		} else {
			this.hide();
			this._error('njPopover, hide popover, no content for showing.');
		}
		this.position();


		this._cb('loaded');
	break;
	}

	return this;
}

njPopover.prototype._insertContent = function (content, type) {
	type = type || 'html';

	var o = this.o,
		that = this,

		imgs,
		length,
		readyImgs = 0;



	if(typeof o.imgs === 'string' && type !== 'text') {
		var $fragment = $(document.createDocumentFragment());
		$fragment.append($(content));
		
		imgs = $fragment.find(o.imgs);
		length = imgs.length;


		if(length) {
			if(!this._o.loading) this.loading('on');
			//when dimensions of all imgs will be known, call callback
			for (var i = 0, l = length; i < l ;i++) {
				findImgSize(imgs[i])
			}
		} else {

			insert.call(this);
		}
	} else {
		insert.call(this);
	}
	
	function insert() {
		//set content
		switch(type) {
		case 'text':
			this.v.popover.text(content)
		break;
		case 'html':
			this.v.popover.html(content)
		break;
		case 'selector':
			this._o.contentEl = $(content);

			if(this._o.contentEl.length) {
				//make element visible
				if(this._o.contentEl.css('display') === 'none') {
					this._o.contentEl.css('display', 'block');
					this._o.contentDisplayNone = true;//flag shows that element we used as content, initially was hidden
				}

				this.v.popover.append(this._o.contentEl);
			} else {
				this._error('njPopover, wrong content selector or no such element.', true)
			}
		break;
		}
	}

	function findImgSize(img) {
		var counter = 0,
			interval,
			njpSetInterval = function(delay) {
				if(interval) {
					clearInterval(interval);
				}

				interval = setInterval(function() {
					// if(img.naturalWidth > 0) {//works only in ie9
					if(img.width > 0) {
						++readyImgs;

						if(readyImgs === length) {
							that._cb('imagesReady');
							
							if(that._o.xhr) {
								insert.call(that);
							} else {
								that.loading('off');
							}
							that.position();
						}

						clearInterval(interval);
						return;
					}

					if(counter > 200) {
						clearInterval(interval);
					}

					counter++;
					if(counter === 3) {
						njpSetInterval(10);
					} else if(counter === 40) {
						njpSetInterval(50);
					} else if(counter === 100) {
						njpSetInterval(500);
					}
				}, delay);
			};

		njpSetInterval(1);
	}
}




njPopover.prototype._removeTrigger = function () {
	var  o = this.o;

	if(!this._o.trigger) return;

	switch(this._o.trigger) {
	case 'click':
		o.$elem.off('click.njp.njp_'+this._o.id);
	break;
	case 'follow':
	case 'hover':
		o.$elem.off('mouseenter.njp.njp_'+this._o.id);
		o.$elem.off('mouseleave.njp.njp_'+this._o.id);
	break;
	case 'focus':
		o.$elem.off('focus.njp.njp_'+this._o.id);
		o.$elem.off('blur.njp.njp_'+this._o.id);
	break;
	}
	delete this._o.trigger;
}

njPopover.prototype.options = function (opts) {
	if(!opts) return;

	var o = this.o,
		banned = ['elem','autobind','attr'];

	if(this._o.trigger) {
		this._removeTrigger();
		this.o.trigger = opts.trigger;
		this._setTrigger();
	}

	//delete options, that we can't redefine
	for (var i = 0, l = banned.length; i < l ;i++) {
		delete opts[banned[i]];
	}


	this.o = $.extend(true, this.o, opts);

	return this;
}





















