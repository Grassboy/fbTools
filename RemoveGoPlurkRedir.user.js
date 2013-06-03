// ==UserScript==
// @name        RemoveGoPlurkRedir
// @namespace   Plurk
// @description Remove the go.plurk.com redirection in your plurk timeline
// @include     http://www.plurk.com/*
// @version     0.1
// @grant       unsafeWindow
// ==/UserScript==

location.href = "javascript:(" + function(){
    if(!window.Media) return;
    /*Remove http://go.plurk.com redirection*/
    eval("window.Media._hideLink = " + window.Media._hideLink.toString().replace("window.open(b","window.open(c.href"));
}.toString() + ")()";
