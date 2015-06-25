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
window.njPopover = function(opts) {
	opts = opts || {};

	if(!(this instanceof njPopover)) {//when we call njPopover not as a contructor, make instance and call it
		opts._iife = true;//flag that it is self-invoked call, if iife we destroy it, while hiding popover
		return new njPopover(opts).show();
	}

	this._init(opts);
	return this;
};

//global settings/methods
njPopover.instances =	{//we make array like object with all active instances of plugin
							length:0
						}


// njPopover.getLast = njPopover.last = function () {//public function that returns last instance of popover
// 	return njPopover.instances[njPopover.instances.length - 1];
// }
// njPopover.hideLast = njPopover.hide = function () {//public function that close last instance of popover
// 	if(njPopover.instances.length) return njPopover.instances[njPopover.instances.length - 1].hide();
// }
njPopover.forElement = function (elem) {//return instance
	return $(elem)[0].njPopover;
}



var proto = njPopover.prototype;

proto._init = function (opts) {
	opts = opts || {};
	var o = this.o = $.extend(true, {}, njPopover.defaults, opts),
		that = this;

	this._o = {//inner options
		'coords':{},
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
			throw new Error('njPopover, can\'t be initialized again on this element.');
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

			if(attrContent) o.content = attrContent;
		}

		o.elem.njPopover = this;
	} else {
		o.trigger = false;//if we have no element, we should use manually show/hide
	}

	//if it immidiatly invoked function, we shouldn't write it in global set of instances
	if(o._iife) {
		this._o.id = +new Date();
	} else {
		//remember instance id in this set, for deleting it when close (todo)
		this._o.id = njPopover.instances.length;
		//write instance to global set of all instances
		Array.prototype.push.call(njPopover.instances, this);
	}

	this._setTrigger();

	this._cb_inited();
}

proto.show = function (opts) {
	opts = opts || {};
	if(this._o.state !== 'inited') {
		throw new Error('njPopover, show, plugin not inited or in not inited state(probably animation is still running or plugin already visible).');
	}
	//todo: заготовка для аякса
	// if(this._o.shown && opts) {
	// 	//opts - передавать в arguments
	// }
	var o = this.o,
			that = this,
			content;

	if(o.elem) this._gatherData();//update our settings

	if(o.anim) {//make animation names
		var tmp = o.anim.split(' ');
		o.animShow = tmp[0];
		(tmp[1]) ? o.animHide = tmp[1] : o.animHide = tmp[0];
	}

	if(typeof o.content === 'function') {
		content = o.content.call(this);
	} else {
		content = o.content;
	}

	if(!content || (typeof content !== 'string' && typeof content !== 'number')) {
		throw new Error('njPopover, no content for popover.');//don't show popover, if we have no content for popover
	}

	if(!o.elem && !o.coords) {
		throw new Error('njPopover, no coords for showing.');//don't show popover if we have no coords for showing
	}

	this.v.container = $(o.container);
	if(!this.v.container.length) {
		throw new Error('njPopover, no container for popover.');//don't do anything, if we have no container
	}

	this.v.wrap = $(o.template).css({'position':'absolute','visibility':'hidden'});
	if(o.zindex) this.v.wrap.css({'zIndex':o.zindex});

	this.v.wrap[0].njPopover = this;
	(o.viewport === 'document') ? this.v.viewport = this.v.document : this.v.viewport = $(o.viewport);

	


	//find element where we should set content
	this.v.popover = this.v.wrap.find('[data-njp]')

	//set content
	switch(o.type) {
	case 'text':
		this.v.popover.text(content)
	break;
	case 'html':
		this.v.popover.html(content)
	break;
	case 'selector':
		// if(!this._o.content) 
		this._o.content = $(content);

		if(this._o.content.length) {
			//make element visible
			if(this._o.content.css('display') === 'none') {
				this._o.content.css('display', 'block');
				this._o.contentDisplayNone = true;//flag shows that element we used as content, initially was hidden
			}

			this.v.popover.append(this._o.content);
		} else {
			throw new Error('njPopover, wrong content selector or no such element.');
		}
	break;
	}

	//toDo waitImg

	if(this._cb_show() === false) return;//callback show

	this.v.container.prepend(this.v.wrap);

	//initial position
	if(opts && opts.e) {
		that.setPosition({init:true, e:opts.e, coords: o.coords});
	} else {
		that.setPosition({init:true, coords: o.coords});
	}

	if(o.animShow) {
		//i don't know why, but elem.getBoundingClientRect used on elem stops any future transitions(june 2015), thats why after position, we hides and show elem again,
		// also working next method:
		// this.v.wrap.remove();
		// this.v.container.prepend(this.v.wrap);

		//this on is working in all browsers
		this.v.wrap.css('display','none');
		this.v.wrap[0].clientHeight;//force relayout
		this.v.wrap.css('display','block');
		

		this.v.popover.addClass('njp-show-'+this.o.animShow);
		this.v.popover[0].clientHeight;//force relayout
		this.v.popover.addClass('njp-shown-'+this.o.animShow);

		this._o.showTimeout = setTimeout(function(){
			that.v.popover.removeClass('njp-show-'+that.o.animShow + ' '+ 'njp-shown-'+that.o.animShow);

			that._cb_shown();
		}, that._getMaxTransitionDuration(this.v.popover[0]));

	} else {
		that._cb_shown();
	}


	if(o.out && o.trigger !== 'follow') {
		this.v.document.on('click.njp.njp_out_'+this._o.id, function (e) {
			var $el = $(e.target);

			if(o.elem) {
				if(o.out === 'self') {
					if($el[0] !== o.elem && !$el.closest('[data-njp-wrap]').length) {
						that.hide();
					}
				} else {
					if($el[0] !== o.elem) {
						that.hide();
					}
				}
			} else {
				if(o.out === 'self') {
					if(!$el.closest('[data-njp-wrap]').length) {
						that.hide();
					}
				} else {
					that.hide();
				}
			}
			

			
		})
	}

	this.v.window.on('resize.njp.njp_'+this._o.id, function () {
		that.setPosition();
	})

	return this;
}

proto.hide = function (opts) {
	opts = opts || {};
	if(this._o.state !== 'show' && this._o.state !== 'shown') {
		throw new Error('njPopover, hide, we can hide only showed popovers(probably animation is still running).');
	}

	var o = this.o,
		that = this;

	//fix for case, when we should run hide, before show animation finished(follow mode for example)
	if(this._o.state === 'show') {
		if(this._o.showTimeout !== undefined) {
			this.v.popover.removeClass('njp-show-'+this.o.animShow + ' '+ 'njp-shown-'+this.o.animShow);
			that._cb_shown();

			clearTimeout(this._o.showTimeout);
			delete this._o.showTimeout;
		}
	}

	if(this._cb_hide() === false) return;//callback hide

	if(o.animHide) {
		this.v.popover.addClass('njp-hide-'+this.o.animHide);
		this.v.popover[0].clientHeight;//force relayout
		this.v.popover.addClass('njp-hidden-'+this.o.animHide);

		setTimeout(function(){
			removePopover();
		}, that._getMaxTransitionDuration(that.v.popover[0]))
	} else {
		removePopover();
	}
	
	this.v.window.off('resize.njp.njp_'+this._o.id);

	function removePopover() {
		if(that._o.contentDisplayNone) {
			that._o.content.css('display', 'none');
			delete that._o.contentDisplayNone;
		}

		if(that._o.content) {
			that.v.body.append(that._o.content);
			delete that._o.content;
		}

		that.v.wrap.remove();
		delete that._o.coords.popoverCoords;

		//delete all variables, because they generated new on every show
		delete that.v.container;
		delete that.v.wrap;
		delete that.v.popover;
		delete that.v.viewport;

		that.v.document.off('click.njp_out_'+that._o.id);

		that._cb_hidden();
	}

	return this;
}

proto.setPosition = function (opts) {
	opts = opts || {};
	if(!this.v.wrap) return;//we can't set position of element, if there is no popover...
	// if(this._o.state !== 'shown' && opts.init !== true) {
	// 	throw new Error('njPopover, position, you can\'t position popover, while it\'s animation or loading.');
	// }

	var o = this.o,
		that = this,
		coords;

	(typeof o.margin === 'number') ? o.margin = o.margin : o.margin = 0;

	//if we have option with coordinates, use this coords
	if(opts.coords) {
		if(typeof opts.coords === 'string') {
			coords = opts.coords.split(' ')
		} else if(typeof opts.coords === 'function') {
			coords = opts.coords.call(this).split(' ');
		}
		
		if($.isArray(coords) && coords.length === 2 && isNumber(coords[0]) && isNumber(coords[1])) {
			this.v.wrap.css({'left' : parseFloat(coords[0])+'px',"top" : parseFloat(coords[1])+'px'});
			if(opts.init) this.v.wrap.css('visibility','visible');

			//remember proper coordinates
			this._o.coords.popoverCoords = getCoords(this.v.wrap[0]);

			this._cb_positioned();
		} else {
			this.hide();
			throw new Error('njPopover, final coords should be string with 2 numbers, popover position is wrong, hide popover.');
		}
		return;	
	}
	function isNumber(n) {
	  return !isNaN(parseFloat(n)) && isFinite(n);
	}


	//if we don't have o.coords, calculate position	
	var eC = this._o.coords.elemCoords = getCoords(o.elem),//trigger element coordinates
		tC = this._o.coords.popoverCoords = getCoords(this.v.wrap[0]),//popover coordinates(coordinates now fake, from this var we need outerWidth/outerHeight)

		left,
		top;

	if(this.v.viewport.length) {
		var vC = this._o.coords.viewportCoords = getCoords(this.v.viewport[0]);//viewport coordinates
	}


	if(o.trigger === 'follow') {
		if(opts.e) {
			left = opts.e.pageX + o.margin;
			top = opts.e.pageY + o.margin;
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
	if(opts.init) this.v.wrap.css('visibility','visible');

	//remember proper coordinates
	this._o.coords.popoverCoords = getCoords(this.v.wrap[0]);

	this._cb_positioned();

	return this;
}

proto.destroy = function () {
	var o = this.o;

	if(o.elem && !o.elem.njPopover) {
		throw new Error('njPopover, nothing to destroy, plugin not initialized.');//nothing to destroy, plugin not initialized
	}

	this._cb_destroy();

	try {
		this.hide();
	} 
	finally {
		//remove all handlers
		if(o.elem) o.$elem.off('.njp');
		this.v.document.off('.njp');

		//restore attribute for element
		if(this._o.origTitle) {
			o.elem.setAttribute('title', this._o.origTitle);
			delete this._o.origTitle;
		}

		if(o.elem) delete o.elem.njPopover;

		if(!o._iife) {
			delete njPopover.instances[this._o.id];
			njPopover.instances.length--;
		}

		this._cb_destroyed();

		return this;
	}
}

proto.setOptions = function (opts) {
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
						that.show({e:e});
					}
				} else {
					that.show({e:e});
				}
				
				if(o.trigger === 'follow') {
					that.v.document.on('mousemove.njp.njp_'+that._o.id, function (e) {
						that.setPosition({e:e});
					})
				}
			})
			
			.on('mouseleave.njp.njp_'+that._o.id, function (e) {
				//if our popover loacated above trigger element, don't hide popover
				var wrap = $(e.relatedTarget).closest('[data-njp-wrap]');

				if(wrap.length) {
					wrap.on('mouseleave.njp.njp_'+that._o.id, function (e) {
						if(e.relatedTarget !== o.elem) {
							if(o.trigger === 'follow') that.v.document.off('mousemove.njp.njp_'+that._o.id)
							that.hide();

							wrap.off('mouseleave.njp.njp_'+that._o.id);
						}
					})
					return;
				}
				if(o.trigger === 'follow') that.v.document.off('mousemove.njp.njp_'+that._o.id)
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

proto._removeTrigger = function () {
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

proto._gatherData = function (first) {//first - only first, initial data gather
	var o = this.o,
		el = o.$elem,
		dataO = el.data(),//data original
		dataMeta = {},//data processed

		numeric = ['margin','zindex'],//properties that we should transform from string to number
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

proto._getMaxTransitionDuration = function (el) {
	var el = $(el),
		str,
		arr;

	if(!$(el).length) return 0;

	str = el.css('transitionDuration');

	if (!str || str == undefined) str = '0s';
	
	arr = str.replace(/s/gi,'').split(', ');

	return Math.max.apply(Math, arr)*1000;
}






//callbacks
proto._cb_inited = function () {//cb - callback
	this._o.state = 'inited';

	var o = this.o;

	this.v.document.triggerHandler('njp_inited', [this]);
	if(o.$elem.length) o.$elem.triggerHandler('njp_inited', [this]);
	if(typeof o.init === 'function') o.init.call(this);
}
proto._cb_show = function () {
	this._o.state = 'show';
	
	var o = this.o;

	this.v.document.triggerHandler('njp_show', [this.v.wrap[0], this]);
	if(o.$elem.length) o.$elem.triggerHandler('njp_show', [this.v.wrap[0], this]);	
	if(typeof o.show === 'function') return o.show.call(this, this.v.wrap[0]);
}
proto._cb_positioned = function () {
	var o = this.o;

	this.v.document.triggerHandler('njp_positioned', [this.v.wrap[0], this]);
	if(o.$elem.length) o.$elem.triggerHandler('njp_positioned', [this.v.wrap[0], this]);
	if(typeof o.positioned === 'function') o.positioned.call(this, this.v.wrap[0]);
}
proto._cb_shown = function () {
	this._o.state = 'shown';

	var o = this.o;

	this.v.document.triggerHandler('njp_shown', [this.v.wrap[0], this]);
	if(o.$elem.length) o.$elem.triggerHandler('njp_shown', [this.v.wrap[0], this]);	
	if(typeof o.shown === 'function') o.shown.call(this, this.v.wrap[0]);
}
proto._cb_hide = function () {
	this._o.state = 'hide';

	var o = this.o;

	this.v.document.triggerHandler('njp_hide', [this.v.wrap[0], this]);
	if(o.$elem.length) o.$elem.triggerHandler('njp_hide', [this.v.wrap[0], this]);	
	if(typeof o.hide === 'function') o.hide.call(this, this.v.wrap[0]);
}
proto._cb_hidden = function () {
	this._o.state = 'inited';

	var o = this.o;
	
	this.v.document.triggerHandler('njp_hidden', [this]);
	if(o.$elem.length) o.$elem.triggerHandler('njp_hidden', [this]);	
	if(typeof o.hidden === 'function') o.hidden.call(this);
}
proto._cb_destroy = function () {
	var o = this.o;
	
	this.v.document.triggerHandler('njp_destroy', [this]);
	if(o.$elem.length) o.$elem.triggerHandler('njp_destroy', [this]);	
	if(typeof o.destroy === 'function') o.destroy.call(this);
}
proto._cb_destroyed = function () {
	this._o.state = 'destroyed';

	var o = this.o;
	
	this.v.document.triggerHandler('njp_destroyed', [this]);
	if(o.$elem.length) o.$elem.triggerHandler('njp_destroyed', [this]);	
	if(typeof o.destroyed === 'function') o.destroyed.call(this);
}









njPopover.defaults = {
	elem: '',//(selector || dom\jQuery element) dom element for triggering popover
	// coords: [],//(array with 2 numbers) X/Y coordinates for positioning popover. Used only when call popover without elem.

	trigger: 'click',//(false || click || hover || focus || follow) how popover is triggered. false - manual triggering
	out: 'self',//(boolean || self) click outside popover will close it, if self is selected, click on popover will not close popover
	margin: 5,//(number) margin from element


	template:'<div class="njp-wrap" data-njp-wrap style="position:absolute;"><div class="njp" data-njp></div></div>',//(string) base HTML to use when creating the popover
	attr: 'title',//get content for popover from this attribute
	type: 'text',//(text || html || selector) type of content, if selector used, whole element will be inserted in tooltip
	content: '',//(string || function) content for popover



	container: 'body',//(selector) appends the popover to a specific element
	viewport: 'document',//(selector || false) keeps the popover within the bounds of this element
	placement: 'bottom',//(top || bottom || left || right) how to position the popover
	auto: true,//(boolean) this option dynamically reorient the popover. For example, if placement is "left", the popover will display to the left when possible, otherwise it will display right.
	zindex: false,//(boolean false || number) zindex that will be set on popover

	anim: 'scale',//(false || string) name of animation (see animation section)
	// waitImg: true//if we have img in popover with [data-njp-img="true"], wait until img begin downloading(to know it's size), only than show tooltip

	autobind: '[data-toggle="popover"]'//(selector) selector that will be used for autobind
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