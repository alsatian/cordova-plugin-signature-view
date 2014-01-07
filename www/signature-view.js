(function() {
    'use strict';
    
    var signature = {
        getSignature: function(filename, successCallback, errorCallback) {
            // Are we on a cordova device (no desktop browser), and is
            // it one of the supported platforms for the native view?
            // XXX: This really requires waiting for deviceReady.
            // OTOH, who's going to present a signature pad first
            // thing upon startup?
            if (typeof window.cordova === 'object' &&
                typeof window.cordova.require === 'function' &&
                typeof window.device === 'object' &&
                ['Android'].indexOf(window.device.platform) !== -1) {
                var SignatureViewNative = window.cordova.require('nl.codeyellow.signature.Signature');
                SignatureViewNative.getSignature.apply(SignatureViewNative.getSignature, arguments);
            } else {
                signature.getSignatureFallback.apply(signature, arguments);
            }
        },
        getSignatureFallback: function(filename, successCallback, errorCallback, title) {
            title = title || "Please sign below";
            var popup = document.createElement('div'),
            cleanUp = function() {
                okButton.removeEventListener('click', okFun);
                cancelButton.removeEventListener('click', cancelFun);
                canvas.removeEventListener('touchstart', touchStart);
                // This next one might've been unset before by the touchstart handler
                canvas.removeEventListener('mousedown', this.mouseDownEvent);
                document.removeEventListener('scroll', determineOffset);
                popup.remove();
            }.bind(this), okFun = function(ev) {
                // Grab the picture from the canvas
                cleanUp();
                successCallback('lalalalala');
            }, cancelFun = function(ev) {
                cleanUp();
                successCallback(null);
            },
            okButton, cancelButton, canvas,
            touchStart = this.touchStart.bind(this),
            determineOffset = this.determineOffset.bind(this);

            popup.id = 'cordova.signature-view:popupwindow';
            popup.style.position = 'fixed';
            popup.style.top = '0';
            popup.style.left = '0';
            popup.style.width = '100%';
            popup.style.height = '100%';
            popup.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            // TODO: Translatable strings for OK/Cancel, make colors configurable
            popup.innerHTML = '<table style="margin: 10em auto; background-color: black;">'+
                '<tr>'+
                '  <th colspan="2" style="color: white"><span id="cordova.signature-view:title"></span></th>'+
                '</tr><tr>'+
                '  <td colspan="2"><canvas style="width: 100%; height: 100%;" id="cordova.signature-view:pad"></canvas></td>'+
                '</tr><tr>'+
                '  <td><button style="width: 100%" id="cordova.signature-view:ok">ok</button></td>'+
                '  <td><button style="width: 100%" id="cordova.signature-view:cancel">cancel</button></td>'+
                '</tr>'+
                '</table>';
            document.body.appendChild(popup);
            document.getElementById('cordova.signature-view:title').appendChild(document.createTextNode(title));
            okButton = document.getElementById('cordova.signature-view:ok');
            okButton.addEventListener('click', okFun);
            cancelButton = document.getElementById('cordova.signature-view:cancel');
            cancelButton.addEventListener('click', cancelFun);

            // A little bit ugly that we rely on "this" so much here, but hey it works
            this.el = canvas = document.getElementById('cordova.signature-view:pad');
            this.determineOffset();
            canvas.addEventListener('touchstart', touchStart, false);
            document.addEventListener('scroll', determineOffset, false);
            this.mouseDownEvent = this.touchStart.bind(this); // So we can unset it upon touch
            canvas.addEventListener('mousedown', this.mouseDownEvent, false);
        },
        determineOffset: function() {
            var el, x = -window.scrollX, y = -window.scrollY;
            for (el = this.el; el.offsetParent; el = el.offsetParent) {
                x += el.offsetLeft - el.scrollLeft;
                y += el.offsetTop - el.scrollTop;
            }
            this.offset = {x: x, y: y};
        },
        touchStart: function(ev) {
            // Only react to single-finger touches/mouse click events directly on the target
            if (ev.eventPhase == Event.AT_TARGET && (!ev.targetTouches || ev.targetTouches.length == 1)) {
                var t = ev.targetTouches ? ev.targetTouches[0] : ev,
                canvas = this.el,
                keepDrawing = true,
                previousFrame = 0,
                positions = [],
                ctx = canvas.getContext('2d'),
                x = this.offset.x,
                y = this.offset.y, // XXX This caches it effectively, so scrolling while drawing doesn't work
                move = function(ev) {
                    if (ev.eventPhase == Event.AT_TARGET && (!ev.targetTouches || ev.targetTouches.length == 1)) {
                        ev.preventDefault();
                        var t = ev.targetTouches ? ev.targetTouches[0] : ev;
                        positions.push([t.clientX - x, t.clientY - y, t.force || t.webkitForce || 0.1]);
                    }
                }, draw = function(frame) {
                    if (frame - previousFrame >= 40) { // Don't try to draw too often
                        var p = positions;
                        positions = [];
                        var i, l = p.length;
                        for(i = 0; i < l; i++) {
                            // Force isn't available (on Android)
                            // ctx.lineWidth = p[2] * 10;
                            ctx.lineTo(p[i][0], p[i][1]);
                        }
                        ctx.stroke();
                        previousFrame = frame;
                    }
                    if (keepDrawing)
                        animateFrame(draw);
                }, end = function(ev) {
                    if (ev.eventPhase == Event.AT_TARGET) {
                        canvas.removeEventListener('mousemove', move);
                        canvas.removeEventListener('touchmove', move);
                        canvas.removeEventListener('mouseup', end);
                        canvas.removeEventListener('touchend', end);
                        keepDrawing = false;
                    }
                }, animateFrame = window.requestAnimationFrame ||
                    window.webkitRequestAnimationFrame ||
                    window.mozRequestAnimationFrame    ||
                    function(callback) { return window.setTimeout(callback, 1000 / 50); };

                ev.preventDefault();

                ctx.beginPath();
                ctx.moveTo(t.clientX - x, t.clientY - y);
                // TODO: Make this color configurable
                ctx.strokeStyle = 'white';
                
                animateFrame(draw);
                if (ev.targetTouches) {
                    canvas.addEventListener('touchmove', move, false);
                    canvas.addEventListener('touchend', end, false);
                    // This prevents the fake mouse event from being dispatched as well
                    canvas.removeEventListener('mousedown', this.mouseDownEvent);
                } else {
                    canvas.addEventListener('mousemove', move, false);
                    canvas.addEventListener('mouseup', end, false);
                }
            }
        },
        clear: function(canvas) { // Currently unused
            var ctx = canvas.getContext('2d');
            ctx.beginPath();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        },
    };
    // Export in an AMD-compliant way, without requiring an AMD loader
    if (typeof module === 'object' && module && typeof module.exports === 'object') {
        module.exports = signature;
    } else {
        window.SignatureView = signature;
        if (typeof define === 'function' && define.amd) {
            define('cordova.signature-view', [], function() { return signature; });
        }
    }
})();