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

	this._o = {};//inner options

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
	if(this._o.shown) return;
	//todo: заготовка для аякса
	// if(this._o.shown && opts) {
	// 	//opts - передавать в arguments
	// }
	var o = this.o,
			that = this;

	this._gatherData();

	if(typeof o.content === 'function') o.content = o.content();
	if(!o.content) return;//don't show popover, if we have no content for popover

	this.v.container = $(o.container);
	this.v.popover = $(o.template);
	this.v.popover[0].njPopover = this;

	//find element where we should set content
	(this.v.popover.is('[data-njPopover]')) 
											? this.v.contentEl = this.v.popover
											: this.v.contentEl = this.v.popover.find('[data-njPopover]');


	
	switch(o.type) {
	case 'text':
		this.v.contentEl.text(o.content)
	break;
	case 'html':
		this.v.contentEl.html(o.content)
	break;
	case 'selector':
		var content = $(o.content);
		if(content.length) {
			this.v.contentEl.append(content);
			return;
		}
	break;
	}


	this._o.status = 'loading';

	this._insertPopover();
}

proto._insertPopover = function () {
	var o = this.o;

	this.v.container.append(this.v.popover);
	this.setPosition();

	this._o.status = 'shown';
	this._o.shown = true;
	//todo
	// if(o.out) {
	// 	$(document).on('click.njp.njp_out', function (e) {
	// 		var $el = $(e.target);

	// 		if($el[0] !== o.elem && !$el.closest('.njPopover').length) {
	// 			that.hide();
	// 		}
	// 	})
	// }
}


proto.hide = function () {
	if(!this._o.shown) return;
	var o = this.o;
	this.v.popover.remove();

	delete this.v.popover;
	// this.o.content = null;??зачем это было - хз

	
	//todo
	// $(document).off('click.njp_out');
	this._o.status = 'hide';//toDO - make hidden status
	this._o.shown = false;
}

proto.setPosition = function () {
	this.v.popover.css({'position': 'absolute',
						'left':0+'px',
	                   'top':0+'px'})
}


proto.destroy = function () {
	if(!o.elem.njPopover) return;//nothing to destroy, plugin not initialized

	var o = this.o;

	this.hide();

	//remove all handlers
	o.$elem.off('.njp');
	$(document).off('.njp');

	//restore attribute for element
	if(this._o.origTitle) {//вернуть аттрибут на место
		o.elem.setAttribute('title', this._o.origTitle)
	}

	delete o.elem.njPopover;
}


proto._setTrigger = function () {
	var o = this.o;

	if(o.trigger) {
		var showEvent = '',
			hideEvent = '';

		switch(o.trigger) {
		case 'click':
			o.$elem.on('click.njp', function (e) {
						e.preventDefault();

						if(this.njPopover._o.shown) {
							this.njPopover.hide();
							return;
						}
						this.njPopover.show()

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
		case 'follow':
			o.$elem.on('mouseenter.njp', function (e) {
						this.njPopover.show();

						$(document).off('mousemove.njp').on('mousemove.njp', function (e) {
							that.setPosition(e);
						})
					})
			.on('mouseleave.njp', function (e) {
				this.njPopover.hide();
				$(document).off('mousemove.njp');
			})
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
					//if out popover loacated above trigger element, don't hide popover
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
	function checkval(val) {
		//make boolean from string
		if(val === 'true') {
			return true;
		} else if(val === 'false') {
			return false;
		} else {
			return val;
		}
	}

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
 			this._o.origTitle = el.attr('title');
 			o.elem.removeAttribute('title');
 			attrContent = this._o.origTitle;
 		} else {
 			attrContent = el.attr(o.attr)
 		}

 		if(attrContent) {
 			o.content = attrContent;
 		}
	}

	$.extend(true, o, dataMeta);
}



njPopover.defaults = {
	container: 'body',//(selector) appends the popover to a specific element
	viewport: 'document',//(selector || false) keeps the popover within the bounds of this element

	template:'<div class="njPopover" data-njPopover></div>',//(string) base HTML to use when creating the popover
	attr: 'title',//get content for popover from this attribute
	type: 'text',//(text || html || selector) type of content, if selector used, whole element will be inserted in tooltip
	content: '',//(string || function) content for popover

	waitImg: true,//if we have img in popover with [data-njp-img="true"], wait until img begin downloading(to know it's size), only than show tooltip
	
	trigger: 'hover',//(false || click || hover || focus || follow) how popover is triggered. false - manual triggering
	out: true,//(boolean) click outside popover will close it
	margin: 5,//(number) margin from element

	placement: 'top',//(top || bottom || left || right) how to position the popover
	auto: true//(boolean) this option dynamically reorient the popover. For example, if placement is "left", the popover will display to the left when possible, otherwise it will display right.
}

})(window, document);