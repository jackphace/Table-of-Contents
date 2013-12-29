//When the page is ready, built the table of contents on everything
$(function() {
    buildToC();
});

//Hotkeys/speeds
var collapseGroupHotkey = 'v';
var previousHotkey = 'z';
var currentHotkey = 'x';
var nextHotkey = 'c';
var tocHotkey = 't';
var selectParentHotkey = 'b';
var scrollSpeed = 400;
var toggleSpeed = 400;

//Default settings not handled in chrome storage/options page
var linkHeight = '17px';
var selectors = 'h1,h2,h3,h4,h5,h6';
var hoverableSelectors = 'div,body';  //',html';
var skipCollapsed = false;                  //Skips over children of collapsed elements
var expandOnClick = false;                  //If true, expands collapsed sections when clicked
var activeWhenMinimized = true;             //If true, hotkeys will work when toggled
var requireDeeper = false;                  //If true, filters headers not further down in the page
var filterEmptyHeaders = false;             //If true, filters headers of all whitespace

//Used to generate classes and IDs of some table of contents elements
var prefix = 'toc';
var togglePrefix = 'toggle';
var linkPrefix = 'link';
var groupPrefix = 'group';

//Identifiers for IDs and classes of the table of contents
var sidebarId = "toc-side";
var wrapperId = "toc-wrapper";
var groupId = "toc-group";
var childlessId = "toc-childless";
var expandedId = "toc-expanded";
var collapsedId = "toc-collapsed";
var activeId = "active";
var toggleId = "toc-toggle";
var hoveredId = "toc-hovered";
var hoveringId = "hover";
var acceleratorId = "toc-accelerator";

//Based off prop('tagName') of headers
//The level of headings used for nesting
var headingLevels = {
    "H1": 0,
    "H2": 1,
    "H3": 2,
    "H4": 3,
    "H5": 4,
    "H6": 5
};

//Number of divs open at a particular depth, indexed by heading level
var openDivs = [];
for (var h in headingLevels) {
    openDivs[headingLevels[h]] = 0;
}

//Build the table of contents
function buildToC(container) {
    //Only execute if a table of contents hasn't been built already
    if (document.getElementById(sidebarId) !== null) {
        console.log("Table of contents already created.");
        return;
    }
    else {
        //Hotkey only builds ToC one time
        Mousetrap.unbind(tocHotkey);

        //Add side bar and wrapper for ToC links
        $('body').append('<div id="' + sidebarId + '"><div id="' + wrapperId + '"></div></div>');

        //Find all matched selectors
        var headings;
        if (arguments.length > 0)
            headings = $(container).find(selectors);
        else
            headings = $(selectors);

        //Get the number of digits in the ToC to be made to figure out length of accelerators
        var digits = numDigits(headings.length);

        var toc = $('#' + wrapperId);
        var tocHtml = '';

        //Filter what the ToC links to in various ways
        headings = filterHeadings(headings);

        //For each heading...
        headings.each(function (i, header) {
            //Find header to be linked to in table of contents
            var h = $(header);

            //Add anchor to DOM before the header linked to
            var anchor = '<a id="' + prefix + i + '"></a>';
            $(h).before(anchor);

            //Find the type of tag the header is
            var tagType = h.prop('tagName');

            //Close all divs that are open at the same or lower levels than the current heading level
            var closeDivs = "";
            var closed = 0;
            for (var l = headingLevels[tagType]; l < openDivs.length; l++) {
                //Add number of divs open at level
                for (var j = 0; j < openDivs[l]; j++) {
                    closeDivs += "</div>";
                    closed++;
                }

                //Clear div count
                openDivs[l] = 0;
            }
            //Add closed divs to close to DOM
            tocHtml += closeDivs;

            //Wrap this table of contents group in a div
            tocHtml += '<div class="' + groupId + ' ' + childlessId + '" id="' + groupPrefix + i + '">';

            //Incrememnt number of open divs at appropriate level
            openDivs[headingLevels[tagType]]++;

            //Add a collapse toggle
            tocHtml += '<div class="' + togglePrefix + tagType + ' ' + toggleId + '"></div>';

            //Add an anchor in the table of contents of the corresponding class to scroll to the other anchor
            var linkText = h.text();
            if ($.trim(linkText) === '')
                linkText = '&lt;blank&gt;';
            var link = '<a class="' + prefix + tagType + '" id="' + linkPrefix + i + '" href="#' + prefix + i + '">' + linkText + '</a>';
            tocHtml += link;

            //Get the accelerator shortcut text for the current header
            var accelText = getHotkeyText(digits, i);
            tocHtml += accelText;
        });

        //Close all unclosed divs at any depth
        var closeDivs = "";
        for (var h in headingLevels) {
            for (var i = 0; i < openDivs[headingLevels[h]]; i++) {
                closeDivs += "</div>";
            }
        }
        tocHtml += closeDivs;

        //Add the table of contents to the wrapper
        $('#' + wrapperId).html(tocHtml);

        //For each link, set up the click / keyboard shortcut functionality
        $('#' + wrapperId + ' a').each(function (index, link) {
            $(link).click(function () {
                clickedOnLink(index, link);
                return false;
            });
            addHotkey(digits, index);
        });

        //TODO Indent the toggles to indicate depth
        //TAKEN CARE OF IN CSS FOR NOW

        //Set first link in table of contents as the active one
        $('#' + wrapperId + ' a').first().addClass(activeId);

        //Add collapsible regions to each link group with children groups
        //debugger;
        $('#' + wrapperId + ' .' + groupId).each(
            function (index, group) {
                group = $(group);
                //If the group has one or more child groups...
                if (group.children('.' + groupId).length > 0) {
                    //Add the expanded class to it
                    group.removeClass(childlessId).addClass(expandedId);

                    //Remove from the groups toggle the default class, add expanded class, 
                    //Add click function to child toggle                    
                    var toggle = group.children('.' + toggleId);
                    toggle.click(function () {
                        if (group.hasClass(expandedId)) {
                            collapseSection(group, toggle);
                        }
                        else if (group.hasClass(collapsedId)) {
                            expandSection(group, toggle);
                        }
                    });
                }
            });

        //Change build table of contents hotkey to toggle
        Mousetrap.bind(tocHotkey, toggleToC);

        //Add accelerators for next / previous / current link navigation
        //console.log("binding hotkeys:" + nextHotkey + currentHotkey + previousHotkey + collapseGroupHotkey);
        Mousetrap.bind(nextHotkey, function () { moveSection(1); });
        Mousetrap.bind(currentHotkey, function () { moveSection(0); });
        Mousetrap.bind(previousHotkey, function () { moveSection(-1); });
        Mousetrap.bind(collapseGroupHotkey, function () {
            toggleCurrentSection();
        });

        //Try making toc-side draggable
        $('#' + sidebarId).drags();
    }
}

//Filter out targets for the table of contents
function filterHeadings(headings) {    
    //Filter out elements that are not lower in the document    
    if (requireDeeper) {
        //The first heading will be used as the default top point
        var previousOffset = $(headings[0]).offset().top;

        for (var i = 1; i < headings.length; i++) {
            //Get current headings's offset
            var newOffset = $(headings[i]).offset().top;

            //Check if the old offset is deeper than the next one
            if (newOffset < previousOffset) {
                //Get rid of the new offset if it is
                headings.splice(i, 1);
                i--;
            } else {
                //Otherwise keep the heading and set the required depth to be the new heading's depth
                previousOffset = newOffset;
            }
        }
    }

    //Filter out empty headers    
    if (filterEmptyHeaders) {
        headings = headings.filter(function(index) {
            return $.trim($(this).text()) !== '';
        });
    }

    //Filter out headers with no children..? Etc.

    return headings;
}

//Behavior triggered by clicking on a link in the table of contents
function clickedOnLink(index, link) {
    //Only allow navigation if the ToC is expanded or permits hotkeys when collapsed
    if (activeWhenMinimized || $('#' + sidebarId).css('display') !== 'none') {
        //Add scrolling to link
        $.scrollTo('#' + prefix + index, scrollSpeed, { easing: 'swing' });

        //Remove any link that is in the active state, add this as active
        $('#' + wrapperId + ' .' + activeId).removeClass(activeId);
        $(link).addClass(activeId);

        //If clicking expands groups...
        if (expandOnClick) {

            //Expand all parent groups to ensure this group is visible
            $(link).parents('#' + wrapperId + ' .' + groupId).each(
                function (index, parentGroup) {
                    expandSection($(parentGroup));
                });
        }
        //Disable default click navigation to link (which make stuff blink)
        return false;
    }
}

//Remove Table of Contents
function removeToC() {
    //Get rid of all the hotkeys
    Mousetrap.reset();

    //Get rid of all elements in ToC
    if ($('#' + sidebarId).length > 0)
        $('#' + sidebarId).remove();
}

//Add border to hovered element. After click, choose select element.
function chooseContainer() {
    //Get rid of any old table of contents that may exist
    removeToC();

    //Set any currently hovered items to proper state..?
    //TODO. ASK SMARTER PEOPLE. Below line highlights shallowest element regardless of hovered
    //highlightDeepestHoverable();    

    //Next click chooses the hovered container to build ToC on
    $(document).on('click.chooseContainer', function (e) {
        //Stop other click events from being triggered
        e.stopPropagation();        //Might make more sense to do hovering top level using this

        //Get rid of parent selection hotkey
        Mousetrap.unbind(selectParentHotkey);

        var container = $(hoverableSelectors).find('.' + hoveredId);

        if (container.length === 1) {
            buildToC(container);
        }
        else {
            buildToC();
        }

        //Remove toc-hovered from all hoverable
        var hoverable = $(hoverableSelectors).removeClass(hoveredId);

        //Remove click functionality using event namespacing
        //http://stackoverflow.com/questions/209029/best-way-to-remove-an-event-handler-in-jquery
        $(document).off('click.chooseContainer');
        $(hoverableSelectors).off('mouseenter.tocHover').off('mouseleave.tocHover').removeClass(hoveredId + ' ' + hoveringId);
        
        //Make sure there is no background striping.  Weird bug.
        $('html').redraw();
    });

    //Add Mouse event to move up the selected items parent tree
    Mousetrap.bind(selectParentHotkey, function () {
        //Move up tree of containers
        $(hoverableSelectors).find('.' + hoveredId).removeClass(hoveredId).parent().addClass(hoveredId);
    });

    //Display hover stripes over the deepest item selected.
    $(hoverableSelectors)
            .on('mouseenter.tocHover',    
        //On mouse enter
        function () {
            //Workaround for broken :hover pseudo in jQuery 1.91
            $(this).addClass(hoveringId);

            highlightDeepestHoverable();
        })
        .on('mouseleave.tocHover',
        //On mouse out
        function () {
            $(this).removeClass(hoveringId);

            highlightDeepestHoverable();
        });
}

//Highlight the most narrow scope of the hovered items
function highlightDeepestHoverable() {
    //Remove toc-hovered from all hoverable
    var hoverable = $(hoverableSelectors).removeClass(hoveredId);

    //Add hover state only to deepest selector
    var depth = -1;
    var deepestSection = $('body');
    var hovered = hoverable.find('.' + hoveringId);

    //Make sure there is no background striping.  Weird bug.
    $('html').redraw();

    hovered.each(function (index, h) {        
        var sectionDepth = $(h).parents().length;

        if (sectionDepth > depth) {
            depth = sectionDepth;
            deepestSection = h;
        }
    });

    $(deepestSection).addClass(hoveredId);
}

//Helper function to avoid weird issue where background keeps hovered stripes
jQuery.fn.redraw = function() {
    return this.hide(0, function(){$(this).show()});
};

//Toggle the expand state of the currently active group
function toggleCurrentSection() {
    var activeGroup = $('.' + groupId + ' .' + activeId).parent();
    var activeToggle = activeGroup.children('.' + toggleId);

    if (activeGroup.hasClass(expandedId)) {
        collapseSection(activeGroup, activeToggle);
    }
    else if (activeGroup.hasClass(collapsedId)) {
        expandSection(activeGroup, activeToggle);
    }
}

//When a toggle with parent toc-group with .toc-expanded class is clicked...
function collapseSection(group, toggle) {
    //Get the toggle if it wasn't provided as an argument
    if (arguments.length < 2)
        toggle = group.children('.' + toggleId);

    //Only collapse if the state is expanded
    if (group.hasClass(expandedId)) {
        //Store the size of the expanded group
        group.data('originalHeight', group.height());

        //Collapse the group and change the toggle to collapsed
        group.animate(
        {
            height: linkHeight
        }, toggleSpeed, function () {
            //Set class to collapsed on completion
            group
            .removeClass(expandedId)
            .addClass(collapsedId);
        });
    }
}
//When a toggle with parent toc-group with .toc-collapsed class is clicked...
function expandSection(group, toggle) {
    //Get the toggle if it wasn't provided as an argument
    if (arguments.length < 2)
        toggle = group.children('.' + toggleId);

    //Only expand if the state is collapsed
    if (group.hasClass(collapsedId)) {
        $(group)
    .animate(
    {
        //Animate to old height
        height: group.data('originalHeight')
    }, toggleSpeed, function () {
        //Set class to collapsed on completion
        group
        .removeClass(collapsedId)
        .addClass(expandedId);

        //Remove the div's height attribute after animating so it doesn't cause gaps if children are collapsed
        group.css('height', '');
    });
    }
}
//Navigates through the links in the table of contents by the input offset
function moveSection(offset) {
    //Select all toc-groups if...
    if (activeWhenMinimized ||                          //You don't care if the ToC is minimized
        $('#' + sidebarId).css('display') !== 'none'        //Or if the ToC isn't minimized
//        $('.toc-collapsed .active').length === 1        //Or if the active link is hidden..?
        ) {

        //Find all the groups that are "visible"
        var visible = $('.' + groupId);

        //If skipping collapsed groups, filter out groups missing "display:none"
        if (skipCollapsed)
            visible = visible.filter(function (index) {
                //Only keep groups that are either visible or the direct parent of the active link 
                return $(this).css('display') !== 'none' ||
                    $(this).children('.' + activeId).length === 1;
            });

        //Get the links that are the children of the visible groups
        var visibleLinks = visible.children('a');

        //Find the index of the active link in the list of visible elements
        var currentIndex = visibleLinks.index($('a.' + activeId));

        //No active element found
        if (currentIndex === -1) {
            //TODO Decide whether to set the first element as active..?
            return false;
        } else {
            //Find the new offset based on the requested shift and the current active link
            var nextIndex = (((offset + currentIndex) % visible.length) + visible.length) % visible.length;

            //Click the link offset the requested amount from the currently active one
            visibleLinks[nextIndex].click();
        }
    }
}
//Toggles the collapsed state of the table of contents
function toggleToC() {
    var side = $('#' + sidebarId);
    
    //If not collapsed, set a max-height equal to current height to prevent the ToC expanding downwards
    //TODO do this in CSS
    if (side.width() !== 0)
        side.css('max-height', side.height());

    $('#' + sidebarId).animate(
        {
            width: 'toggle'
        }, toggleSpeed, function () {
            //Make sure there is no max-height when finished animating
            side.css('max-height', '');
        });
}

//Adds a hotkey chapter accelerator for an item in the ToC
function addHotkey(digits, index) {
    var zeroPaddedText = index.toString().lpad(digits, '0');

    //Add spaces between every character to create the accelerator shortcut
    var accelerator = zeroPaddedText[0];
    for (var i = 1; i < zeroPaddedText.length; i++) {
        accelerator += " " + zeroPaddedText[i];
    }

    Mousetrap.bind(accelerator, function (e) {
        $('#' + linkPrefix + index).click();
    });

    //return;
}
//Helper functions for adding hotkeys
function getHotkeyText(digits, index) {
    var zeroPaddedText = index.toString().lpad(digits, '0');
    var accelText = '<span class="' + acceleratorId + '">' + zeroPaddedText + '</span>';

    return accelText;
}
function log10(val) {
    return Math.log(val) / Math.LN10;
}
function numDigits(number) {
    return (number === 0) ? 1 : parseInt(log10(number), 10) + 1;
}
String.prototype.lpad = function (length, padChar) {
    var s = this;
    while (s.length < length)
        s = padChar + s;
    return s;
};

//Draggable sans jquery-ui courtesy of: http://css-tricks.com/snippets/jquery/draggable-without-jquery-ui/
(function ($) {
    $.fn.drags = function (opt) {

        //opt = $.extend({ handle: "", cursor: "move" }, opt);
        opt = $.extend({ handle: "", cursor: "" }, opt);

        if (opt.handle === "") {
            var $el = this;
        } else {
            var $el = this.find(opt.handle);
        }

        return $el.css('cursor', opt.cursor).on("mousedown", function (e) {
            if (opt.handle === "") {
                var $drag = $(this).addClass('draggable');
            } else {
                var $drag = $(this).addClass('active-handle').parent().addClass('draggable');
            }
            var z_idx = $drag.css('z-index'),
                drg_h = $drag.outerHeight(),
                drg_w = $drag.outerWidth(),
                pos_y = $drag.offset().top + drg_h - e.pageY,
                pos_x = $drag.offset().left + drg_w - e.pageX;
            $drag.css('z-index', 1000).parents().on("mousemove", function (e) {
                $('.draggable').offset({
                    top: e.pageY + pos_y - drg_h,
                    left: e.pageX + pos_x - drg_w
                }).on("mouseup", function () {
                    $(this).removeClass('draggable').css('z-index', z_idx);
                });
            });
            e.preventDefault(); // disable selection
        }).on("mouseup", function () {
            if (opt.handle === "") {
                $(this).removeClass('draggable');
            } else {
                $(this).removeClass('active-handle').parent().removeClass('draggable');
            }
        });

    }
})(jQuery);