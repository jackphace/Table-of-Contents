$(function () {
    //Don't reload page
    $('form').submit(function () { return false; });

    //Display slider values
    displayRanges();

    //Load existing values
    loadValues();

    //Click 'save' button to save values
    $('#save').click(saveOptions);

    //Auto-save options when they're changed
    //$('#options input').change(function(inputChanged) {
    //    saveOptions();          //Might want to change this to just 
    //});
});

//Let the user know the value of the slider when it changes
function displayRanges() {
    $("input[type='range']").change(function () {
        var slider = $(this);
        slider.next("output").text(slider.val() + ' ms');
    })
    .trigger('change');
}

//Hotkeys: tocHotkey, previousHotkey, currentHotkey, nextHotkey, collapseGroupHotkey, selectParentHotkey,
//Features: activeWhenMinimized, expandOnClick, skipCollapsed,
//Filters: requireDeeper, filterEmptyHeaders
//Speeds: scrollSpeed, toggleSpeed
function saveOptions() {
    var output = 'Saving values...';
    $('#status').html(output);

    var valuesToSave = {};

    //Save out all non-null input
    $('input').each(function (i, el) {
        var key = el.id;
        var val = el.value;
        
        //For checkboxes the value should be the checked status
        if(el.type === "checkbox")
            val = el.checked;
        
        //Todo: Some sort of better validation than checking if the value is empty
        if ($.trim(val) !== '') {
            valuesToSave[key] = val;
        }
    });

    // Save it using the Chrome sync storage API.
    //chrome.storage.local.set   -- 5mb of local storage
    //    for (key in valuesToSave)
    //        chrome.storage.sync.set({ key: valuesToSave[key] })
    chrome.storage.sync.set(valuesToSave, function () {
        output += '<br />Saved options successfully!';
        $('#status').html(output);

        return false;
    });

    return false;
}

//Loads previously saved values
function loadValues() {
    var valuesToLoad = [];

    //Request all elements that might have a storage value
    $('input').each(function (i, el) {
        valuesToLoad[i] = el.id;
    });

    chrome.storage.sync.get(valuesToLoad, function (items) {
        console.log(chrome.runtime.lastError === null);

        console.log(items);

        //'items' is the associative array of values for the inputs with the key name
        for (var key in items)
        {
            var input = $('#' + key);

            if (input.length === 1) {
                //If a checkbox, set checked status to stored
                if (input[0].type === "checkbox")
                    input.attr('checked', items[key]);
                //Otherwise set the value
                else
                    input.val(items[key]);
            }
        }

        //Set the range values
        //$("input[type='range']").each(function (i, el) {
        //    $(el).next('output').val($(el).val());
        //});
        $("input[type='range']").trigger('change');
    });
}