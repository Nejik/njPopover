 /*!
 * njTooltip - v0.1
 * nejikrofl@gmail.com
 * Copyright (c) 2015 N.J.
*/
;(function(window, document, undefined){
'use strict';
var $ = window.jQuery || window.j;


//constructor
window.njPopover = function (opts) {
	opts = opts || {};
	if(!(this instanceof njPopover)) {//when we call njTabs not as a contructor, make instance and call it
		// return new njPopover(opts);
		return;
	}

	var o = this.o = $.extend(true, {}, njPopover.defaults, opts),
		that = this;

	o.$elem = $(o.elem);

	this._o = {};//inner options

	this.v = {};//object with cached variables

	if(o.attr === 'title') {
		this._o.origTitle = o.$elem.attr(o.attr);
		o.elem.removeAttribute(o.attr);
	}

	//bind
	if(o.trigger) {
		var showEvent = '',
			hideEvent = '';
		switch(o.trigger) {
		case 'hover':
			showEvent = 'mouseenter.njp'
			hideEvent = 'mouseleave.njp'
		break;
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
		case 'focus':
			showEvent = 'focus.njp'
			hideEvent = 'blur.njp'
		break;
		case 'mouse':
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

	o.elem.njPopover = this;
}

var njt = njPopover.prototype;

njt.show = function () {
	if(this._o.shown) return;
	var o = this.o,
		that = this;

	this._gatherData();
	
	this.v.container = $(o.container);


	this.v.tooltip = document.createElement('div');
	this.v.tooltip.className += 'njPopover';
	this.v.tooltip = $(this.v.tooltip);

	if(o.html) {
		this.v.tooltip.html(o.content);
	} else {
		this.v.tooltip.text(o.content);
	}

	if(o.waitImg) {
		var img = this.v.tooltip.find('img'),
			img2wait = $([]);

		if(img.length) {
			img.each(function (i,el) {
				if($(el).attr('data-njp-img') != undefined) {
					img2wait = img2wait.add(el);
				}
			})
			if(img2wait.length) {
				img2wait.each(function (i,el) {
					findImgSize(el);
				})
			} else {
				insertPopover.call(this);
			}
		} else {
			insertPopover.call(this);
		}
	} else {
		insertPopover.call(this);
	}




	function findImgSize(img) {
		var counter = 0,
			interval,
			clonedImg = new Image();

		clonedImg.src = img.src;

		var njmSetInterval = function(delay) {
			if(interval) {
				clearInterval(interval);
			}
			interval = setInterval(function() {
				if(clonedImg.width > 0) {
					img.njpReady = true;
					checkAllImgsReady();

					clearInterval(interval);
					return;
				}

				if(counter > 200) {
					clearInterval(interval);
				}

				counter++;
				if(counter === 3) {
					njmSetInterval(10);
				} else if(counter === 40) {
					njmSetInterval(50);
				} else if(counter === 100) {
					njmSetInterval(500);
				}
			}, delay);
		};

		

		njmSetInterval(1);
	}

	function checkAllImgsReady() {
		var length = img2wait.length,
			ready = 0;

		img2wait.each(function (i,el) {
			if(el.njpReady) ready += 1;
		})

		if(ready === length) {
			insertPopover.call(that)	
		}
	}





	function insertPopover() {
		this.v.container.append(this.v.tooltip);
 		this.setPosition();

		this.v.tooltip[0].njPopover = this;
		this._o.shown = true;
	}



	
}

njt.setPosition = function (ev) {
	var  o = this.o;

	var eC = this._o.elemCoords = this._getCoords(o.elem);//elCoords
	var tC = this._o.tooltipCoords = this._getCoords(this.v.tooltip[0]);//toltip coords, coords before position we need fo outerWidth/outerHeight

	if(o.trigger === 'mouse') {
		if(ev) {
			this.v.tooltip.css({'left':ev.pageX + o.margin +'px',"top":ev.pageY + o.margin +'px'})
		}
	} else {
		findCoords.call(this, o.placement);
	}

	function findCoords(placement, stop) {//stop flag needed to prevent endless recursion if both placements wrong
		var left,top;
		
		switch(placement) {
		case 'bottom':
			var left = eC.left + (eC.width - tC.width)/2^0;//^0 - round
			var top = eC.top + eC.height + o.margin;
		break;

		case 'top':
			var left = eC.left + (eC.width - tC.width)/2^0;//^0 - round
			var top = eC.top - tC.height - o.margin;
		break;
		case 'left':
			var left = eC.left - o.margin - tC.width;
			var top = eC.top + (eC.height - tC.height)/2^0;
		break;
		case 'right':
			var left = eC.right + o.margin;
			var top = eC.top + (eC.height - tC.height)/2^0;
		break;
		}

		//reorient popover
		if(o.auto && !stop) {//stop - flag to prevent infinite change position
			if(placement === 'left' && left < 0) {
				findCoords.call(this, 'right', 'stop');
				return;
			}
			if(placement === 'right' && left > document.documentElement.clientWidth - tC.width) {
				findCoords.call(this, 'left', 'stop');
				return;
			}
			if(placement === 'top' && top < 0) {
				findCoords.call(this, 'bottom', 'stop');
				return;
			}
			if(placement === 'bottom' && top > document.body.scrollHeight - tC.height) {
				findCoords.call(this, 'top', 'stop');
				return;
			}
		}

		//take popover in document
		if(o.inDocument) {
			// if(placement === 'bottom' || placement === 'top') {
				if(left < 0) left = 0;
				var maxLeft = document.documentElement.clientWidth - tC.width;
				if(left > maxLeft) left = maxLeft;

			// } else if(placement === 'left' || placement === 'right') {
				if(top < 0) top = 0;
				var maxTop = document.body.scrollHeight - tC.height;
				if(top > maxTop) top = maxTop;
			// }
		}

		this.v.tooltip.css({'left':left+'px',"top":top+'px'})
	}
}

njt.hide = function () {
	if(!this._o.shown) return;
	var o = this.o;
	this.v.tooltip.remove();

	delete this.v.tooltip;
	this.o.content = null;

	$(document).off('click.njp_out');
	this._o.shown = false;
}




njt._gatherData = function () {
	var o = this.o,
		el = o.$elem,
		dataO = el.data(),//data original
		dataMeta = {};//data processed

	//get data from data attributes
	for (var p in dataO) {//use only data properties with njt prefix
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


	$.extend(true, o, dataMeta);


	if(o.attr === 'title') {
		o.content = el.attr(o.attr) || this._o.origTitle;
	}
	
};




njt._getCoords = function (elem) {
	var box = elem.getBoundingClientRect();
	
	var body = document.body;
	var docEl = document.documentElement;

	var scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
	var scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

	var clientTop = docEl.clientTop || body.clientTop || 0;
	var clientLeft = docEl.clientLeft || body.clientLeft || 0;

	// var top  = box.top +  scrollTop - clientTop;
	// var left = box.left + scrollLeft - clientLeft;

	return { 
		top: box.top + scrollTop - clientTop,
		left: box.left + scrollLeft - clientLeft,

		right: box.right,
		bottom: box.bottom,
		width: box.right - box.left,
		height: box.bottom - box.top
	};
}

njPopover.defaults = {
	container: 'body',

	attr: 'title',
	type: 'text',//(text||html||selector)
	html: true,

	waitImg: true,//if we have img in tooltip with [data-njp-img="true"], wait until img begin downloading(to know it's size), only than show tooltip
	
	trigger: 'click',//(click || hover || focus || mouse)
	out: true,//click outside popover will close it
	margin: 5,
	placement: 'top',
	auto: true,
	inDocument: true
}

//autobind
$(function() {
	$('['+njPopover.defaults.attr+']').each(function () {
		new njPopover({elem:this});
	})
});

})(window, document);