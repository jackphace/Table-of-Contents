﻿$(document).ready(function () {
    var path = chrome.extension.getURL('css/toc.css');
    $('head').append($('<link>')
        .attr("rel", "stylesheet")
        .attr("type", "text/css")
        .attr("href", path));
});