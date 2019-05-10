
/*
 * Copyright (c) 2019 Parallax Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 * and associated documentation files (the “Software”), to deal in the Software without
 * restriction, including without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */


/**
 *
 * @type {{SPIN: string, PROPC: string}}
 */
var projectTypes = {
    "PROPC": "blocklyc.jsp",
    "SPIN": "blocklyc.jsp"
};


/**
 * SimpleMDE package for textarea editing
 * 
 * @type {null}
 */
var simplemde = null;


/**
 *
 * @type {{}}
 */
var pd = {};


/**
 *
 * @type {boolean}
 */
var isOffline = $("meta[name='isOffline']").attr("content") == 'true' ? true : false;


/*
 * Add some special sauce to the project creation page
 */
$(document).ready(function () {
    /*  Activate the tooltips ?     */
    $('[rel="tooltip"]').tooltip();

    simplemde = new SimpleMDE({
        element: document.getElementById("project-description"),
        hideIcons: ["link"],
        spellChecker: false
    });

    /* Set the project language from the URL parameter 'lang'. If the 
     * parameter is not provided, default to PROPC.
     */
    var language = getURLParameter('lang');

    if (language == null) {
        language = "PROPC";
    }

    $('#project-type').val(language);

/*
    $('[data-toggle="wizard-radio"]').click(function () {
        wizard = $(this).closest('.wizard-card');
        wizard.find('[data-toggle="wizard-radio"]').removeClass('active');
        $(this).addClass('active');
        $(wizard).find('[type="radio"]').removeAttr('checked');
        $(this).find('[type="radio"]').attr('checked', 'true');
    });

    $('[data-toggle="wizard-checkbox"]').click(function () {
        if ($(this).hasClass('active')) {
            $(this).removeClass('active');
            $(this).find('[type="checkbox"]').removeAttr('checked');
        } else {
            $(this).addClass('active');
            $(this).find('[type="checkbox"]').attr('checked', 'true');
        }
    });
*/

    // TODO: What is this?
    $height = $(document).height();
    $('.set-full-height').css('height', $height);
    
    var tt = new Date();

    var isEdit = getURLParameter('edit');

    if (isEdit === 'true' && isOffline) {
        pd = JSON.parse(window.localStorage.getItem('localProject'));
        $('#project-name').val(pd['name']);
        simplemde.value(pd['description']);
        $("#project-description-html").html(pd['description-html']);
        $('#board-type').val(pd.board);
    } else if (isOffline) {
        pd = {
                'board': '',
                'code': '<xml xmlns=\"http://www.w3.org/1999/xhtml\"></xml>',
                'created': tt,
                'description': '',
                'description-html': '',
                'id': 0,
                'modified': tt,
                'name': '',
                'private': true,
                'shared': false,
                'type': "PROPC",
                'user': "offline",
                'yours': true,
        }
    }
});


/**
 *
 * @returns {boolean}
 */
function validateFirstStep() {

    $(".proj").validate({
        rules: {
            'project-name': "required",
            'board-type': "required"
        },
        messages: {
            'project-name': "Please enter a project name",
            'board-type': "Please select a board type"
        }
    });

    if (!$(".proj").valid()) {
        //form is invalid
        return false;
    }

    return true;
}


/**
 *
 */
$.fn.serializeObject = function ()
{
    var o = {};
    var a = this.serializeArray();
    $.each(a, function () {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};


/**
 *
 */
$('#finish').on('click', function () {
    if (validateFirstStep()) {
        var formData = $(".proj").serializeObject();
        formData['project-description'] = simplemde.value();
        formData['project-description-html'] = simplemde.options.previewRender(simplemde.value());
        
        if (!isOffline) {
            $.post('createproject', formData, function (data) {
                if (data['success']) {
                    window.location = $('#finish').data('editor') + projectTypes[getURLParameter('lang')] + "?project=" + data['id'];
                } else {
                    if (typeof data['message'] === "string")
                        alert("There was an error when BlocklyProp tried to create your project:\n" + data['message']);
                    else
                        alert("There was an error when BlocklyProp tried to create your project:\n" + data['message'].toString());
                }
            });
        } else {
            // Offline mode project persistance
            pd.board = formData['board-type'];
            pd.description = formData['project-description'];
            pd['name'] = formData['project-name'];
            pd['description-html'] = formData['project-description-html'];

            /* Save the current project into a key/value pair persisted in
             * the browser's local storage.
             *
             * This really should call something that persists the project
             * to the user's local hard dirve. Also note that the key is
             * hard-coded, which means only one project can be saved.
             */
            window.localStorage.setItem('localProject', JSON.stringify(pd));


            // Redirect the browser
        	// window.location = '/blocklyc.html';
            window.location.href = '/blocklyc.html?project=0';
        }
    }
});
