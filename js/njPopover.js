 /*!
 * njPopover - v0.2
 * nejikrofl@gmail.com
 * Copyright (c) 2015 N.J.
*/
;(function(window, document, undefined){
'use strict';
var $ = window.jQuery || window.j;

if(!$) {
	throw new Error('njPopover requires jQuery or "j" library (https://github.com/Nejik/j)');
	return false;
}
//insert styles to page
// +function () {
// 	var style = document.createElement('style');
// 	style.type = 'text/css';
// 	style.innerHTML = '.njPopover {\
// 									position:absolute;\
// 									opacity:0;\
// 									z-index:10000;\
// 									padding: 5px 10px;\
// 									border-radius: 4px;\
// 									text-align: center;\
// 									background: #fff;\
// 									box-shadow: 0px 0px 8px 1px rgba(0,0,0,.3);}';
// 	document.getElementsByTagName('head')[0].appendChild(style);
// }();
//constructor
window.njPopover = function(opts) {
	opts = opts || {};

	if(!(this instanceof njPopover)) {//when we call njPopover not as a contructor, make instance and call it
		return new njPopover(opts);
	}

	this._init(opts);
	return this;
};

njPopover.forElement = function (elem) {//return instance
	return $(elem)[0].njPopover;
}

var proto = njPopover.prototype;

proto._init = function (opts) {
	opts = opts || {};
	var o = this.o = $.extend(true, {}, njPopover.defaults, opts),
		that = this;

	this._o = {'coords':{}};//inner options

	this.v = {};//object with cached variables

	o.$elem = $(o.elem);
	o.elem = $(o.elem)[0];//for case if we get jquery object in o.elem

	this._gatherData(true);


	if(o.elem.njPopover) return;//we can't initialize 2 times

	this._setTrigger();


	this._o.status = 'inited';
	o.elem.njPopover = this;
}

proto.show = function () {
	if(this._o.status !== 'inited' && this._o.status !== 'hidden') return;
	//todo: заготовка для аякса
	// if(this._o.shown && opts) {
	// 	//opts - передавать в arguments
	// }
	var o = this.o,
			that = this;

	this._gatherData();//update our settings

	if(o.out) {
		this._o.out = +new Date();

		$(document).on('click.njp.njp_out_'+this._o.out, function (e) {
			var $el = $(e.target);

			if(o.out === 'self') {
				if($el[0] !== o.elem && !$el.closest('.njp-wrap').length) {
					that.hide();
				}
			} else {
				if($el[0] !== o.elem) {
					that.hide();
				}
			}

			
		})
	}

	if(typeof o.content === 'function') o.content = o.content.call(this);
	if(!o.content) return;//don't show popover, if we have no content for popover

	this.v.container = $(o.container);
	this.v.wrap = $(o.template);
	this.v.wrap[0].njPopover = this;

	(o.viewport && o.viewport === 'document') ? this.v.viewport = $(document) : this.v.viewport = $(o.viewport);

	//find element where we should set content
	// (this.v.wrap.is('.njp')) 
	// 										? this.v.popover = this.v.wrap
	// 										: this.v.popover = this.v.wrap.find('.njp');
	this.v.popover = this.v.wrap.find('.njp')

	
	switch(o.type) {
	case 'text':
		this.v.popover.text(o.content)
	break;
	case 'html':
		this.v.popover.html(o.content)
	break;
	case 'selector':
		var content = $(o.content);
		if(content.length) {
			this.v.popover.append(content);
			return;
		}
	break;
	}

	//toDo waitImg

	this.v.container.append(this.v.wrap);

	that.setPosition();

	this._cb_show();//callback show
	if(o.animShow) {
		//i don't know why, but elem.getBoundingClientRect used on elem stops any future transitions, thats why after position, we remove and insert elem again...
		// this.v.wrap.remove();
		// this.v.container.append(this.v.wrap);

		//i don't know why, but elem.getBoundingClientRect used on elem stops any future transitions, thats why after position, we hides and show elem again
		this.v.popover.css('display','none')
		this.v.popover[0].clientHeight;//force relayout
		this.v.popover.css('display','block')


		this.v.popover.addClass('njp-show-'+this.o.animShow);
		this.v.popover[0].clientHeight;//force relayout
		this.v.popover.addClass('njp-shown-'+this.o.animShow);

		setTimeout(function(){
			that.v.popover.removeClass('njp-show-'+that.o.animShow + ' '+ 'njp-shown-'+that.o.animShow);

			that._cb_shown();
		}, that._getMaxTransitionDuration(this.v.popover[0]))
	} else {
		that._cb_shown();
	}
}

proto.hide = function () {
	if(this._o.status !== 'shown') return;
	var o = this.o,
		that = this;

	this._cb_hide();

	if(o.animHide) {
		this.v.popover.addClass('njp-hide-'+this.o.animHide);
		this.v.popover[0].clientHeight;//force relayout
		this.v.popover.addClass('njp-hidden-'+this.o.animHide);

		setTimeout(function(){
			removePopover();
			that._cb_hidden();
		}, that._getMaxTransitionDuration(that.v.popover[0]))
	} else {
		removePopover();
		this._cb_hidden();
	}
	

	function removePopover() {
		that.v.wrap.remove();

		// delete that.v.wrap;
		// that.o.content = null;??зачем это было - хз

		$(document).off('click.njp_out_'+that._o.out);
		delete that._o.out;
	}
}

proto.setPosition = function (e) {
	var o = this.o,
		that = this,
		eC = this._o.coords.elemCoords = getCoords(o.elem),//trigger element coordinates
		tC = this._o.coords.tooltipCoords = getCoords(this.v.wrap[0]),//popover coordinates(coordinates now fake, from this var we need outerWidth/outerHeight)

		left,
		top;

	if(o.viewport && this.v.viewport.length) {
		var vC = this._o.coords.viewportCoords = getCoords(this.v.viewport[0]);//viewport coordinates
	}


	if(o.trigger === 'follow') {
		if(e) {
			left = e.pageX + o.margin;
			top = e.pageY + o.margin;
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
			if(this.v.viewport && this.v.viewport.length) {
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

	this.v.wrap.css({'left':left+'px',"top":top+'px'});

	//remember proper coordinates
	this._o.coords.tooltipCoords = getCoords(this.v.wrap[0]);

	this._cb_positioned();

	function getCoords(elem) {
		if(elem === document) {
			var body = $('body')[0],
				html = $('html')[0],
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
}

proto.destroy = function () {
	var o = this.o;

	if(!o.elem.njPopover) return;//nothing to destroy, plugin not initialized

	this._cb_destroy();

	this.hide();

	//remove all handlers
	o.$elem.off('.njp');
	$(document).off('.njp');

	//restore attribute for element
	if(this._o.origTitle) {
		o.elem.setAttribute('title', this._o.origTitle);
		delete this._o.origTitle;
	}

	delete o.elem.njPopover;

	this._cb_destroyed();
}

proto._setTrigger = function () {
	var o = this.o,
		that = this;

	if(o.trigger) {
		var showEvent = '',
			hideEvent = '';

		switch(o.trigger) {
		case 'click':
			o.$elem.on('click.njp', function (e) {
						e.preventDefault();

						if(this.njPopover._o.status === 'shown') {
							this.njPopover.hide();
							return;
						}
						this.njPopover.show()

					})

		break;
		case 'follow':
			o.$elem.on('mouseenter.njp', function (e) {
						this.njPopover.show();
						$(document).off('mousemove.njp').on('mousemove.njp', function (e) {
							that.setPosition(e);
						})
					})
			.on('mouseleave.njp', function (e) {
				var that = this;
					//if our popover loacated above trigger element, don't hide popover
					if($(e.relatedTarget).closest('.njPopover').length) {
						$(e.relatedTarget).closest('.njPopover').on('mouseleave.njp', function () {
							that.njPopover.hide();
							$(document).off('mousemove.njp');
						})
						return;
					}

				this.njPopover.hide();
				$(document).off('mousemove.njp');
			})
		break;


		case 'hover':
			showEvent = 'mouseenter.njp'
			hideEvent = 'mouseleave.njp'
		break;
		
		case 'focus':
			showEvent = 'focus.njp'
			hideEvent = 'blur.njp'
		break;
		
		}

		if(showEvent) {
			o.$elem.on(showEvent, function (e) {
						this.njPopover.show();

						e.preventDefault();
					})
		}

		if(hideEvent) {
			o.$elem.on(hideEvent, function (e) {
				var that = this;
				if(o.trigger === 'hover') {
					//if our popover loacated above trigger element, don't hide popover
					if($(e.relatedTarget).closest('.njPopover').length) {
						$(e.relatedTarget).closest('.njPopover').on(hideEvent, function () {
							that.njPopover.hide();
						})
						return;
					}
				}
				e.preventDefault();
				this.njPopover.hide();
			})
		}
	}
}


proto._gatherData = function (first) {//first - only first, initial data gather
	var o = this.o,
		el = o.$elem,
		dataO = el.data(),//data original
		dataMeta = {};//data processed

	//get data from data attributes
	for (var p in dataO) {//use only data properties with njp prefix
		if (dataO.hasOwnProperty(p) && /^njp[A-Z]+/.test(p) ) {
			var shortName = p.match(/^njp(.*)/)[1],
				shortNameLowerCase = shortName.charAt(0).toLowerCase() + shortName.slice(1);

			dataMeta[shortNameLowerCase] = checkval(dataO[p]);
		}
	}

	function checkval(val) {//make boolean from string
		if(val === 'true') {
			return true;
		} else if(val === 'false') {
			return false;
		} else {
			return val;
		}
	}
	//transform string with number to number type
	if(dataMeta.margin) dataMeta.margin = parseInt(dataMeta.margin);

	//properties we can't redefine
	if(!first) {
		delete dataMeta.trigger;
		delete dataMeta.attr;
	}

	//we can't redefine elem in any case
	delete dataMeta.elem;


	if(o.attr) {
		var attrContent;

		if(o.attr === 'title') {
			// if(!this._o.origTitle)
			if(el.attr('title')) this._o.origTitle = el.attr('title');
			
			o.elem.removeAttribute('title');
			attrContent = this._o.origTitle;
		} else {
			attrContent = el.attr(o.attr)
		}

		if(attrContent) {
			o.content = attrContent;
		}
	}

	if(dataMeta.anim) {
		var tmp = dataMeta.anim.split(' ');
		dataMeta.animShow = tmp[0];
		(tmp[1]) ? dataMeta.animHide = tmp[1] : dataMeta.animHide = tmp[0];
	}

	$.extend(true, o, dataMeta);
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







proto._cb_positioned = function () {
	var o = this.o;

	$(document).triggerHandler('njp_positioned', [this.v.wrap[0], this]);
	if(o.$elem.length) o.$elem.triggerHandler('njp_positioned', [this.v.wrap[0], this]);
	if(o.positioned) o.positioned.call(this, this.v.wrap[0]);
}

proto._cb_show = function () {//cb - callback
	this._o.status = 'show';
	
	var o = this.o;


	$(document).trigger('njp_show', [this.v.wrap[0], this]);
	if(o.$elem.length) o.$elem.triggerHandler('njp_show', [this.v.wrap[0], this]);	
	if(o.show) o.show.call(this, this.v.wrap[0]);
}
proto._cb_shown = function () {
	this._o.status = 'shown';

	var o = this.o;


	$(document).triggerHandler('njp_shown', [this.v.wrap[0], this]);
	if(o.$elem.length) o.$elem.triggerHandler('njp_shown', [this.v.wrap[0], this]);	
	if(o.shown) o.shown.call(this, this.v.wrap[0]);
}
proto._cb_hide = function () {
	this._o.status = 'hide';

	var o = this.o;

	$(document).triggerHandler('njp_hide', [this.v.wrap[0], this]);
	if(o.$elem.length) o.$elem.triggerHandler('njp_hide', [this.v.wrap[0], this]);	
	if(o.hide) o.hide.call(this, this.v.wrap[0]);
}
proto._cb_hidden = function () {
	this._o.status = 'hidden';

	var o = this.o;
	
	$(document).triggerHandler('njp_hidden', [this.v.wrap[0], this]);
	if(o.$elem.length) o.$elem.triggerHandler('njp_hidden', [this.v.wrap[0], this]);	
	if(o.hidden) o.hidden.call(this, this.v.wrap[0]);
}
proto._cb_destroy = function () {
	var o = this.o;
	
	$(document).triggerHandler('njp_destroy', [this.v.wrap[0], this]);
	if(o.$elem.length) o.$elem.triggerHandler('njp_destroy', [this.v.wrap[0], this]);	
	if(o.destroy) o.destroy.call(this, this.v.wrap[0]);
}
proto._cb_destroyed = function () {
	this._o.status = 'destroyed';

	var o = this.o;
	
	$(document).triggerHandler('njp_destroyed', [this.v.wrap[0], this]);
	if(o.$elem.length) o.$elem.triggerHandler('njp_destroyed', [this.v.wrap[0], this]);	
	if(o.destroyed) o.destroyed.call(this, this.v.wrap[0]);
}









njPopover.defaults = {
	elem: '',//(selector || dom\jQuery element) dom element for triggering popover

	trigger: 'click',//(false || click || hover || focus || follow) how popover is triggered. false - manual triggering
	out: 'self',//(boolean || self) click outside popover will close it
	margin: 5,//(number) margin from element


	template:'<div class="njp-wrap"><div class="njp"></div></div>',//(string) base HTML to use when creating the popover
	attr: 'title',//get content for popover from this attribute
	type: 'text',//(text || html || selector) type of content, if selector used, whole element will be inserted in tooltip
	content: '',//(string || function) content for popover



	container: 'body',//(selector) appends the popover to a specific element
	viewport: 'document',//(selector || false) keeps the popover within the bounds of this element
	placement: 'top',//(top || bottom || left || right) how to position the popover
	auto: true,//(boolean) this option dynamically reorient the popover. For example, if placement is "left", the popover will display to the left when possible, otherwise it will display right.

	anim: false,//(false || string) name of animation (see animation section)
	// waitImg: true//if we have img in popover with [data-njp-img="true"], wait until img begin downloading(to know it's size), only than show tooltip
}

})(window, document);