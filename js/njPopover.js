/*!
 * njPopover - v0.2
 * nejikrofl@gmail.com
 * Copyright (c) 2015 N.J.
*/
;(function(window, document, undefined){
'use strict';
var $ = window.jQuery || window.j;

if(!$) {
	throw new Error('njPopover, requires jQuery or "j" library (https://github.com/Nejik/j)');
}

//constructor
window.njPopover = function(el, options) {
	var opts;

	if(!options) {
		if(typeof el === 'string' || el.nodeType) {
			opts = {elem:el}
		} else if(typeof el === 'object') {
			opts = el;
		} else {
			throw new Error('njPopover, don\'t recognize first argument.');
		}
	} else {
		if(typeof el === 'string' || el.nodeType) {
			options.elem = el;

			opts = options;
		} else {
			throw new Error('njPopover, don\'t recognize first argument.');
		}
	}

	opts = opts || {};

	if(!(this instanceof njPopover)) {//when we call njPopover not as a contructor, make instance and call it
		opts._iife = true;//flag that it is self-invoked call, if iife we destroy it, while hiding popover
		return new njPopover(opts).show();
	} else {
		this._init(opts);
		return this;
	}
};

//global settings/methods
njPopover.instances =	{//we make array like object with all active instances of plugin
							length:0
						}

njPopover.a = {};//addons

njPopover.getLast = function () {//public function that returns last instance of popover
	return njPopover.instances[njPopover.instances.length - 1];
}
njPopover.hideLast = function () {//public function that close last instance of popover
	if(njPopover.instances.length) return njPopover.instances[njPopover.instances.length - 1].hide();
}
njPopover.forElement = function (elem) {//return instance
	return $(elem)[0].njPopover;
}



var proto = njPopover.prototype;

proto._init = function (opts) {
	opts = opts || {};
	var o = this.o = $.extend(true, {}, njPopover.defaults, opts),
		that = this;

	this._o = {//inner options
		'visible': false,
		'coords':{}
	};

	this.v = {//object with cached variables
		document: $(document),
		window: $(window),
		html: $('html'),
		body: $('body')
	};

	o.$elem = $(o.elem);
	o.elem = $(o.elem)[0];//for case if we get jquery object in o.elem

	if(o.elem) {
		if(o.elem.njPopover) {
			this._error('njPopover, can\'t be initialized again on this element.')
		}
		this._gatherData(true);

		if(o.attr) {
			var attrContent;

			if(o.attr === 'title') {
				if(o.$elem.attr('title')) this._o.origTitle = o.$elem.attr('title');
				
				o.elem.removeAttribute('title');
				attrContent = this._o.origTitle;
			} else {
				attrContent = o.$elem.attr(o.attr)
			}

			if(attrContent && !o.content) o.content = attrContent;
		}

		o.elem.njPopover = this;
	} else {
		o.trigger = false;//if we have no element, we should use manually show/hide
	}

	if(!o.elem && ((!o.coords || !o.content))) {
		this._error('njPopover, no element or no coords or content settings, nothing to show, destroy.')//don't show popover if we have no coords for showing
	}

	//remember instance id in this set, for deleting it when close (todo)
	this._o.id = njPopover.instances.length;
	//write instance to global set of all instances
	Array.prototype.push.call(njPopover.instances, this);

	this._setTrigger();

	this._cb('inited');
}

proto.show = function (loading) {//loading - flag for showing popover already in loading state
	if(this._o.state !== 'inited') {
		this._error('njPopover, show, plugin not inited or in not inited state(probably animation is still running or plugin already visible).');
	}

	if(this._cb('show') === false) return;//callback show

	var o = this.o,
			that = this;

	if(o.elem) this._gatherData();//update our settings

	if(typeof o.content === 'function') {
		this._o.content = o.content.call(this);
	} else {
		this._o.content = o.content;
	}

	if(!this._o.content) {
		this._error('njPopover, no content for popover.', true);
	}

	if(!o.elem && !o.coords) {
		this._error('njPopover, no coords for showing.', true)
	}

	this.v.container = $(o.container);
	if(!this.v.container.length) this.v.container = this.v.body;//in case if we have no container element, or wrong selector for container element


	this.v.wrap = $(o.template).css({'position':'absolute','visibility':'hidden'});
	if(!this.v.wrap) {
		this._error('njPopover,smth wrong with o.template.', true);
	}
	if(o.zindex) this.v.wrap.css({'zIndex':o.zindex});

	this.v.wrap[0].njPopover = this;
	(o.viewport === 'document') ? this.v.viewport = this.v.document : this.v.viewport = $(o.viewport);

	if(!this.v.viewport.length) this.v.viewport = this.v.document;//in case if we have no viewport element, or wrong selector for viewport element
	
	//find element where we should set content
	this.v.popover = this.v.wrap.find('[data-njp]');
	if(!this.v.popover.length) {
		this._error('njPopover, there is no element [data-njp] in o.template.', true);
	}
	if(o.class) this.v.popover.addClass(o.class);


	if(!loading) {//for case when we call .loading('on') when popover is hidden
		if(o.type === 'ajax') {
			if(njPopover.a.extended) {
				this.ajax(o.content);
			} else {
				this._error('njPopover, you should enable extended addon.', true)
			}
		} else {
			if(!this._o.loading) this._insertContent(this._o.content, o.type);
		}
	}
	

	this.v.container.prepend(this.v.wrap);//we prepend, not append, because append of even absolute div, changes height of body(it's bad for positioning)

	//initial position
	this.position();

	//i don't know why, but elem.getBoundingClientRect used on elem stops any future transitions(june 2015), thats why after position, we hides and show elem again(also we can remove and append element again)
	this.v.wrap.css('display','none');
	this.v.wrap[0].clientHeight;//force relayout
	this.v.wrap.css('display','block');

	this._anim('show');

	//set event handlers
	if(o.out) {
		this.v.document.on('click.njp.njp_out_'+this._o.id, function (e) {
			var $el = $(e.target);

			if(o.elem) {
				if(o.out === true) {
					if(!o.elem.contains($el[0]) && !$el.closest('[data-njp]').length) {
						that.hide();
					}
				} else if(o.out === 'all') {
					if(!o.elem.contains($el[0])) {
						that.hide();
					}
				}
			} else {
				if(o.out === true) {
					if(!$el.closest('[data-njp]').length) {
						that.hide();
					}
				} else if(o.out === 'all') {
					that.hide();
				}
			}
		})
	}

	this.v.window.on('resize.njp.njp_'+this._o.id, function () {
		that.position();
	})
	this.v.document.on('click.njp_close.njp_'+this._o.id, '[data-njp-close]', function () {
		that.hide();
	})

	return this;
}



proto.hide = function () {
	if(this._o.state !== 'show' && this._o.state !== 'shown') {
		this._error('njPopover, hide, we can hide only showed popovers (probably animation is still running).')
	}

	var o = this.o,
		that = this;

	//fix for case, when we should run hide, before show animation finished(follow mode for example)
	if(this._o.state === 'show') {
		if(this._o.showTimeout !== undefined) {
			this.v.popover.removeClass('njp-show-'+this.o.animShow + ' '+ 'njp-shown-'+this.o.animShow);
			that._cb('shown');

			clearTimeout(this._o.showTimeout);
			delete this._o.showTimeout;
		}
	}

	if(this._cb('hide') === false) return;//callback hide

	this._anim('hide', removePopover);

	function removePopover() {
		that.v.wrap.remove();

		that._clear();//remove all stuf that was made by plugin

		that._cb('hidden');
	}

	that.v.document.off('click.njp_out_'+that._o.id);
	that.v.document.off('click.njp_close.njp_'+that._o.id);
	if(o.trigger === 'follow') {
		that.v.document.off('mousemove.njp.njp_'+that._o.id)
		that.v.document.off('mouseleave.njp.njp_'+that._o.id)
	}
	that.v.window.off('resize.njp_'+that._o.id);

	if(o._iife) this.destroy();
	return this;
}

proto.position = function (opts) {
	if(!this.v.wrap) return;//we can't set position of element, if there is no popover...

	var o = this.o,
		that = this,
		coords,
		mode;

	(typeof o.margin === 'number') ? o.margin = o.margin : o.margin = 0;

	opts = opts || that.o.e || o.coords;
	//if we have option with coordinates, use this coords
	if(typeof opts === 'string' || typeof opts === 'function') {
		if(typeof opts === 'string') {
			coords = opts.split(' ')
		} else if(typeof opts === 'function') {
			coords = opts.call(this).split(' ');
		}
		
		if($.isArray(coords) && coords.length === 2 && this._isNumber(coords[0]) && this._isNumber(coords[1])) {
			this.v.wrap.css({'left' : parseFloat(coords[0])+'px',"top" : parseFloat(coords[1])+'px'});

			//remember proper coordinates
			this._o.coords.popoverCoords = getCoords(this.v.wrap[0]);

			this._cb('positioned');
		} else {
			this.hide();
			this._error('njPopover, final coords should be string with 2 numbers, popover position is wrong, hide popover.');
		}
		return;	
	}

	if(!o.elem) return;
	//if we don't have o.coords, calculate position	
	var eC = this._o.coords.elemCoords = getCoords(o.elem),//trigger element coordinates
		tC = this._o.coords.popoverCoords = getCoords(this.v.wrap[0]),//popover coordinates(coordinates now fake, from this var we need outerWidth/outerHeight)
		vC = this._o.coords.viewportCoords = getCoords(this.v.viewport[0]),//viewport coordinates

		left,
		top;

	if(o.trigger === 'follow' && opts.pageX) {
		if(opts) {
			left = opts.pageX + o.margin;
			top = opts.pageY + o.margin;
		} else {
			return;//we can't do anything, if there is no event with coordinates on follow mode
		}
	} else {
		findCoords.call(this, o.placement);
	}



	function findCoords(placement, reorient) {//reorinet -  flag needed to prevent endless recursion if both placements wrong
		switch(placement) {
		case 'bottom':
			left = eC.left + (eC.width - tC.width)/2^0;//^0 - round
			top = eC.top + eC.height + o.margin;
		break;

		case 'top':
			left = eC.left + (eC.width - tC.width)/2^0;//^0 - round
			top = eC.top - tC.height - o.margin;
		break;
		case 'left':
			left = eC.left - o.margin - tC.width;
			top = eC.top + (eC.height - tC.height)/2^0;//^0 - round
		break;
		case 'right':
			left = eC.right + o.margin;
			top = eC.top + (eC.height - tC.height)/2^0;//^0 - round
		break;
		}

		
		//reorient position if no space for popover for this placement
		if(o.auto && !reorient) {
			var docCoords;
			if(this.v.viewport.length) {
				docCoords = vC;
			} else {
				docCoords = getCoords(document);
			}

			if(placement === 'top' && top < docCoords.top) {
				findCoords.call(this, 'bottom', true);
				return;
			}
			if(placement === 'bottom' && top > docCoords.bottom) {
				findCoords.call(this, 'top', true);
				return;
			}
			if(placement === 'left' && left < docCoords.left) {
				findCoords.call(this, 'right', true);
				return;
			}
			if(placement === 'right' && left > docCoords.right) {
				findCoords.call(this, 'left', true);
				return;
			}
		}
	}


	//fix position with viewport option
	if(this.v.viewport.length) {
		var minLeft = vC.left,
			maxLeft = vC.right - tC.width,
			minTop = vC.top,
			maxTop = vC.bottom - tC.height;

		if(left < minLeft) left = minLeft;
		if(left > maxLeft) left = maxLeft;
		
		if(top < minTop) top = minTop;
		if(top > maxTop) top = maxTop;
	}

	function getCoords(elem) {
		if(elem === document) {
			var body = that.v.body[0],
				html = that.v.html[0],
				width = document.body.scrollWidth,
				height = Math.max( body.scrollHeight, body.offsetHeight, 
					   html.clientHeight, html.scrollHeight, html.offsetHeight);

			return {
				top:0,
				left:0,

				right: width,
				bottom: height,
				width: width,
				height: height
			}
		} else if(elem) {
			var box = elem.getBoundingClientRect();
			
			var body = document.body,
				docEl = document.documentElement,

				scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop,
				scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft,
				clientTop = docEl.clientTop || body.clientTop || 0,
				clientLeft = docEl.clientLeft || body.clientLeft || 0;

			return {
				top: box.top + scrollTop - clientTop,
				left: box.left + scrollLeft - clientLeft,

				right: box.right + scrollLeft - clientLeft,
				bottom: box.bottom + scrollTop - clientTop,
				width: box.right - box.left,
				height: box.bottom - box.top
			};
		}
	}

	this.v.wrap.css({'left':left+'px',"top":top+'px'});
	

	//remember proper coordinates
	this._o.coords.popoverCoords = getCoords(this.v.wrap[0]);

	this._cb('positioned');

	return this;
}

proto.destroy = function () {
	var o = this.o;

	if(o.elem && !o.elem.njPopover) {
		this._error('njPopover, nothing to destroy, plugin not initialized.')
	}

	this._cb('destroy');

	try {
		this.hide();
	} 
	finally {
		//remove all handlers
		if(o.elem) o.$elem.off('.njp_'+this._o.id);
		this.v.document.off('.njp_'+this._o.id);

		//restore attribute for element
		if(this._o.origTitle) {
			o.elem.setAttribute('title', this._o.origTitle);
			delete this._o.origTitle;
		}

		if(o.elem) delete o.elem.njPopover;

		delete njPopover.instances[this._o.id];
		njPopover.instances.length--;

		this._cb('destroyed');

		return this;
	}
}





proto._setTrigger = function () {
	var o = this.o,
		that = this;

	if(o.trigger) {
		switch(o.trigger) {
		case 'click':
			o.$elem.on('click.njp.njp_'+that._o.id, function (e) {
						e.preventDefault();
						if(that._o.state === 'shown') {
							that.hide();
							return;
						}
						that.show()
					})
		break;
		case 'follow':
		case 'hover':
			o.$elem.on('mouseenter.njp.njp_'+that._o.id, function (e) {
				//don't fire show event, when show mouse came from popover on element(case when popover not placed in container(document))
				if(that.v.wrap && that.v.popover) {
					if(!$(e.relatedTarget).closest('[data-njp-wrap]').length) {
						that.show();
					}
				} else {
					that.o.e = e;
					that.show();
				}
				
				if(o.trigger === 'follow') {
					that.v.document.on('mousemove.njp.njp_'+that._o.id, function (e) {
						that.o.e = e;
						that.position();
					})
				}
			})
			
			.on('mouseleave.njp.njp_'+that._o.id, function (e) {
				//if our popover loacated above trigger element, don't hide popover
				var wrap = $(e.relatedTarget).closest('[data-njp-wrap]');

				if(wrap.length) {
					wrap.on('mouseleave.njp.njp_'+that._o.id, function (e) {
						if(e.relatedTarget !== o.elem) {
							that.hide();

							wrap.off('mouseleave.njp.njp_'+that._o.id);
						}
					})
					return;
				}
				that.hide();
			})
		break;
		case 'focus':
			o.$elem.on('focus.njp.njp_'+that._o.id, function (e) {
						that.show();
						e.preventDefault();
					})
					.on('blur.njp.njp_'+that._o.id, function (e) {
						that.hide();
						e.preventDefault();
					})
		break;
		}
		this._o.trigger = o.trigger;
	}
}

proto._insertContent = function (content, type) {
	type = type || 'html';
	var o = this.o;

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

proto._gatherData = function (first) {//first - only first, initial data gather
	var o = this.o,
		el = o.$elem,
		dataO = el.data(),//data original
		dataMeta = {},//data processed

		numeric = ['margin','zindex','timeout'],//properties that we should transform from string to number
		initial = ['trigger','attr'],//properties that we can define only first time, on init gather data
		banned = ['elem','autobind'];//properties that we can't redefine via data attributes at all


	//if we have data-njp-options, use it
	if(dataO.njpOptions) {
		dataMeta = $.parseJSON(dataO.njpOptions);

		for (var key in dataMeta) {
			if (dataMeta.hasOwnProperty(key)) {
				dataMeta[key] = checkval(dataMeta[key]);
			}
		}
	} else {//get data from data attributes
		for (var p in dataO) {//use only data properties with njp prefix
			if (dataO.hasOwnProperty(p) && /^njp[A-Z]+/.test(p) ) {
				var shortName = p.match(/^njp(.*)/)[1],
					shortNameLowerCase = shortName.charAt(0).toLowerCase() + shortName.slice(1);

				dataMeta[shortNameLowerCase] = checkval(dataO[p]);
			}
		}
	}

	function checkval(val) {//transform string to boolean
		if(val === 'true') {
			return true;
		} else if(val === 'false') {
			return false;
		} else {
			return val;
		}
	}

	//transform string to number
	for (var i = 0, l = numeric.length; i < l ;i++) {
		if(dataMeta[numeric[i]]) dataMeta[numeric[i]] = parseInt(dataMeta[numeric[i]]);
	}

	//delete options, that we can't redefine via data properties
	for (var i = 0, l = banned.length; i < l ;i++) {
		delete dataMeta[banned[i]];
	}

	//delete options, that we can only use on initial gather data
	if(!first) {
		for (var i = 0, l = initial.length; i < l ;i++) {
			delete dataMeta[initial[i]];
		}
	}

	$.extend(true, o, dataMeta);//extend original options with gathered
}

proto._getMaxTransitionDuration = function (el, property) {//method also can get animation duration
	var $el = $(el),
		dur,
		durArr,
		del,
		delArr,
		transitions = [];

	if(!$el.length) return 0;
	if(!property) return 0;

	//make array with durations
	dur = $el.css(property+'Duration');
	if (!dur || dur == undefined) dur = '0s';
	durArr = dur.split(', ');
	for (var i = 0, l = durArr.length; i < l ;i++) {
		durArr[i] = (durArr[i].indexOf("ms")>-1) ? parseFloat(durArr[i]) : parseFloat(durArr[i])*1000;
	}

	//make array with delays
	del = $el.css(property+'Delay');
	if (!del || del == undefined) del = '0s';
	delArr = del.split(', ');
	for (var i = 0, l = delArr.length; i < l ;i++) {
		delArr[i] = (delArr[i].indexOf("ms")>-1) ? parseFloat(delArr[i]) : parseFloat(delArr[i])*1000;
	}

	//make array with duration+delays
	for (var i = 0, l = durArr.length; i < l ;i++) {
		transitions[i] = durArr[i] + delArr[i]
	}

	return Math.max.apply(Math, transitions);
}

proto._anim = function (type, callback) {
	var o = this.o,
		that = this,
		animShow,
		animHide,
		animShowDur,
		animHideDur,
		tmp;

	//get animation names
	if(o.anim) {//make animation names
		tmp = o.anim.split(' ');
		animShow = tmp[0];
		(tmp[1]) ? animHide = tmp[1] : animHide = animShow;
	}

	//get animation durations
	if(o.duration) {
		tmp = o.duration.split(' ');
		animShowDur = tmp[0];
		(tmp[1]) ? animHideDur = tmp[1] : animHideDur = animShowDur;
	}

	switch(type) {
	case 'show':
		this._o.visible = true;
		if(animShow) {
			this.v.popover.addClass('njp-show-'+animShow);
			if(this.v.wrap.css('visibility') === 'hidden') this.v.wrap.css('visibility','visible');
			this.v.popover[0].clientHeight;//force relayout
			this.v.popover.addClass('njp-shown-'+animShow);


			if(!animShowDur || animShowDur === 'auto') {
				animShowDur = that._getMaxTransitionDuration(this.v.popover[0], 'animation') || that._getMaxTransitionDuration(this.v.popover[0], 'transition');
			} else {//if duration was set via options, transform it to number
				animShowDur = parseInt(animShowDur) || 0;
			}

			this._o.showTimeout = setTimeout(function(){
				clearTimeout(that._o.showTimeout);
				delete that._o.showTimeout;

				that.v.popover.removeClass('njp-show-' + animShow + ' ' + 'njp-shown-' + animShow);

				that._cb('shown');
			}, animShowDur);

		} else {
			that._cb('shown');
		}
	break;

	case 'hide':
		if(animHide) {
			this.v.popover.addClass('njp-hide-'+animHide);
			this.v.popover[0].clientHeight;//force relayout
			this.v.popover.addClass('njp-hidden-'+animHide);

			if(!animHideDur || animHideDur === 'auto') {
				animHideDur = that._getMaxTransitionDuration(this.v.popover[0], 'animation') || that._getMaxTransitionDuration(this.v.popover[0], 'transition');
			} else {//if duration was set via options, transform it to number
				animHideDur = parseInt(animHideDur) || 0;
			}

			setTimeout(function(){
				that._o.visible = false;
				callback();
			}, animHideDur)
		} else {
			callback();
		}
	break;
	}
}

proto._error = function (msg, clear) {
	if(!msg) return;

	if(clear) this._clear();

	throw new Error(msg);
}

proto._clear = function () {
	if(this._o.contentDisplayNone) {
		this._o.contentEl.css('display', 'none');
		delete this._o.contentDisplayNone;
	}

	if(this._o.contentEl) {
		this.v.body.append(this._o.contentEl);
		delete this._o.contentEl;
	}

	this._o.state = "inited";

	delete this._o.content
	delete this._o.showTimeout
	this._o.coords = {};
	
	if(this._o.xhr) {
		this.ajax('stop');
	}

	delete this.o.e;

	//delete all variables, because they generated new on every show
	delete this.v.container;
	delete this.v.viewport;
	delete this.v.wrap;
	delete this.v.popover;
}




proto._isNumber = function (n) {

	return !isNaN(parseFloat(n)) && isFinite(n);
}

//callbacks
proto._cb = function (type) {//cb - callback
	var o = this.o;

	if( type !== 'position' &&
		type !== 'positioned' &&
		type !== 'loading' &&
		type !== 'loaded' &&
		type !== 'destroy' &&
		type !== 'ajaxReady' &&
		type !== 'imagesReady'
		) {
		this._o.state = type;
	}

	if(type === 'hidden') this._o.state = 'inited';

	switch(type) {
	case 'loading':
		this._o.loading = true;
	break;
	case 'loaded':
		delete this._o.loading;
	break;
	}


	this.v.document.triggerHandler('njp_'+type, [this]);
	if(o.$elem.length) o.$elem.triggerHandler('njp_'+type, [this]);
	if(typeof o[type] === 'function') return o[type].call(this);
}










njPopover.defaults = {
	elem: '',//(selector || dom\jQuery element) dom element for triggering popover
	// coords: [],//(array with 2 numbers) X/Y coordinates for positioning popover. Used only when call popover without elem.

	trigger: 'click',//(false || click || hover || focus || follow) how popover is triggered. false - manual triggering
	out: true,//(boolean || all) click outside popover will close it, if all is selected click on popover will hide it
	margin: 5,//(number) margin from element


	template:'<div class="njp-wrap" data-njp-wrap style="position:absolute;"><div class="njp" data-njp></div></div>',//(string) base HTML to use when creating the popover
	attr: 'title',//get content for popover from this attribute, if there is no o.content option
	type: 'html',//(html || selector || load) type of content, if selector used, whole element will be inserted in tooltip
	content: '',//(string || function) content for popover
	class: false,//(string) classnames(separated with space) that will be added to popover


	container: 'body',//(selector) appends the popover to a specific element
	viewport: 'document',//(selector || false) keeps the popover within the bounds of this element
	placement: 'bottom',//(top || bottom || left || right) how to position the popover
	auto: true,//(boolean) this option dynamically reorient the popover. For example, if placement is "left", the popover will display to the left when possible, otherwise it will display right.
	zindex: false,//(boolean false || number) zindex that will be set on popover

	anim: 'fade',//(false || string) name of animation, or string with space separated 2 names of show/hide animation
	duration: 'auto',//(string || number || auto) duration of animation, or string with space separated 2 duration of show/hide animation. You can set 'auto 100' if you want to set only duration for hide

	autobind: '[data-toggle~="popover"]'//(selector) selector that will be used for autobind
}

})(window, document);



//autobind
$(document).on('DOMContentLoaded', function () {
	$(njPopover.defaults.autobind).each(function () {
		new njPopover({
			elem: $(this)
		})
	})
})


// jQuery, j plugin
$.fn.njPopover = function(options) {
	var args = arguments;

	if(!this.length) {
		throw new Error('njPopover, there is no items in jQuery object.');//exit if there is no items in jQuery object
	}

	if(!args.length) {//if we have no arguments at all
		if(this[0].njPopover) {//if plugin inited on this element, return instance
			return this[0].njPopover;
		} else {//if plugin not inited on this element, try to init(maybe we have data attributes)
			this.each(function () {
				new njPopover({elem:this});
			})
			return this[0].njPopover;//return instance only for first element
		}
	} else if(typeof options === 'string') {//if we have string, we want to call method
		if(options[0] !== '_') {
			var returns;

			this.each(function () {
				var instance = this.njPopover;

				if (instance instanceof njPopover && typeof instance[options] === 'function') {
					returns = instance[options].apply( instance, Array.prototype.slice.call( args, 1 ) );
				}
			})
		} else {
			throw new Error('njPopover, plugin does not permit private methods.');
		}

		return returns !== undefined ? returns : this;//return result of method or return instance
	} else {//if we have arguments
		return this.each(function () {
			if(typeof options === 'object') {//we have options passed in arguments, init plugin with this options
				options.elem = this;
				new njPopover(options);
			}
			//shortcuts for different methods, this not works, just example
			// else if(typeof options === 'number') {//we have number in arguments, it is shortcut for .show(number) method
			// 	if(this.njPopover) {
			// 		this.njPopover.show(options);
			// 	}
			// }
		});
	}
};