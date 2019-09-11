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
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */


/* ------------------------------------------------------------------
 *                       Modal dialog boxes
 *                  ----------------------------
 *
 *  New Project
 *  Open (Upload) Existing Project
 *  Update Project Details
 *  Save Current Project
 *  Save Current Project Timer
 * ----------------------------------------------------------------*/



/**
 *
 * @description
 *
 * This is code that was refactored out of the editor.js
 * document.ready() handler.
 */
function NewProjectModal() {
    // If the current project has been modified, give the user
    // an opportunity to abort the new project process.
    if (checkLeave()) {
        const message =
            'The current project has been modified. Click OK to\n' +
            'discard the current changes and create a new project.';
        if (! confirm(message)) {
            return;
        }
    }

    // Reset the values in the form to defaults
    $('#new-project-name').val('');
    $('#new-project-description').val('');
    $('#new-project-dialog-title').html(page_text_label['editor_newproject_title']);

    showNewProjectModal('open');
}


/**
 *  Displays the new project modal.
 *
 *  Modal dialog that presents user with options to provide a project
 *  name, a description and drop down menu to select a project board
 *  type.
 *
 *  The modal provides options to cancel, escape and accept the new
 *  project details. If accepted, the accept button callback will
 *  update the global projectData object with a new, empty project.
 *
 *  @param openModal force the modal to open when set to 'open'
 */
function showNewProjectModal() {

    // Set up button event handlers
    NewProjectModalCancelClick();
    NewProjectModalAcceptClick();

    let dialog = $("#new-project-board-type");

    PopulateProjectBoardTypesUIElement(dialog);

    // Show the New Project modal dialog box
    $('#new-project-dialog').modal({keyboard: false, backdrop: 'static'});

    // Populate the time stamp fields
    // TODO: These settings only apply to the Edit Project dialog
    let projectTimestamp = new Date();
    $('#edit-project-created-date').html(projectTimestamp);
    $('#edit-project-last-modified').html(projectTimestamp);
}


/**
 *  New project modal Accept button onClick handler
 */
function NewProjectModalAcceptClick() {

    // Click event handler. When the user clicks the 'Continue'
    // button, validate the form
    // --------------------------------------------------------------
    $('#new-project-continue').on('click', function () {
        // verify that the project contains a valid board type and project name
        if (validateNewProjectForm()) {
            $('#new-project-dialog').modal('hide');

            var code = '';

            // If editing details, preserve the code, otherwise start over
            if (projectData && $('#new-project-dialog-title').html() === page_text_label['editor_edit-details']) {
                code = getXml();
            } else {
                code = EmptyProjectCodeHeader;
            }

            // save the form fields into the projectData object
            projectData = {
                'board': $('#new-project-board-type').val(),
                'code': code,
                'created': $('#edit-project-created-date').html(),
                'description': $("#new-project-description").val(),        // simplemde.value(),
                'description-html': $("#new-project-description").val(),   // simplemde.options.previewRender(simplemde.value()),
                'id': 0,
                'modified': $('#edit-project-created-date').html(),
                'name': $('#new-project-name').val(),
                'private': true,
                'shared': false,
                'type': "PROPC",
                'user': "offline",
                'yours': true,
                'timestamp': getTimestamp(),
            }

            setupWorkspace(JSON.parse(projectData['code']));

            // then load the toolbox using the projectData
            window.localStorage.setItem(localProjectStoreName, JSON.stringify(projectData));

            // Update the UI with the new project name
            showInfo(pd);

            // Redirect to the editor page
            // window.location = 'blocklyc.html';

            // Load up an empty Project
            // TODO: Load an empty project
        }
        resetToolBoxSizing(100); // use a short delay to ensure the DOM is fully ready (TODO: may not be necessary)
    });
}


/**
 *  New project modal Cancel button onClick handler
 */
function NewProjectModalCancelClick() {
    // Set up the click even handler for the "New Project" modal
    // dialog return to the splash screen if the user clicks the
    // cancel button
    // ----------------------------------------------------------
    // This is also handling the 'Edit Project Details' modal
    // dialog box
    // ----------------------------------------------------------
    $('#new-project-cancel').on('click', () => {

        // Dismiss the modal in the UX
        $('#new-project-dialog').modal('hide');

        // if the project is being edited, clear the fields and close the modal
        $('#new-project-board-dropdown').removeClass('hidden');
        $('#edit-project-details-static').addClass('hidden');

        $('#new-project-board-type').val('');
        $('#edit-project-board-type').html('');
        $('#edit-project-created-date').html('');
        $('#edit-project-last-modified').html('');
    });
}


/**
 *  Open the Open Project File dialog
 */
function OpenProjectFileDialog() {
    // set title to Open file
    $('#upload-dialog-title').html(page_text_label['editor_open']);

    // hide "append" button
    $('#selectfile-append').addClass('hidden');

    // change color of the "replace" button to blue and change text to "Open"
    let replace = $('#selectfile-replace');
    if (replace) {
        replace.removeClass('btn-danger').addClass('btn-primary');
        replace.html(page_text_label['editor_button_open']);
    }

    // Import a project .SVG file
    $('#upload-dialog').modal({keyboard: false, backdrop: 'static'});

    // TODO: what is this doing here? Shouldn't we be setting up projectData instead of localStore?
    //       Or can this simply be deleted, because the openFile functions will take care of this?
    if (projectData) {
        console.log("Loading workspace with project %s", localProjectStoreName);
        setupWorkspace(JSON.parse(window.localStorage.getItem(localProjectStoreName)));
    }
}
