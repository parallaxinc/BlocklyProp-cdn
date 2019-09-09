


function OpenOfflineProject() {

    return true;
}


function CreateNewProject() {

    DialogNewProject();
    return true;

}





function DialogNewProject() {
    PopulateNewProjectBoardTypesUIElement();

    // Show the New Project modal dialog box
    $('#new-project-dialog').modal({keyboard: false, backdrop: 'static'});

    // Populate the time stamp fields
    let projectTimestamp = new Date();
    $('#edit-project-created-date').html(projectTimestamp);
    $('#edit-project-last-modified').html(projectTimestamp);

    // if the newProject modal was opened from the editor, flag it so if the user
    // hits cancel they don't lose their work
    $('#open-modal-sender').html('open');

    // when the user clicks the 'Continue' button, validate the form
    $('#new-project-continue').on('click', function () {
        // verify that the project contains a valid board type and project name
        if (validateNewProjectForm()) {
            let code = EmptyProjectCodeHeader;

            // save the form fields into the projectData object
            let pd = {
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

            // then load the toolbox using the projectData
            window.localStorage.setItem('localProject', JSON.stringify(pd));

            // Update the UI with the new project name
            showInfo(pd);

            // Redirect to the editor page
            window.location = 'blocklyc.html';
        }
        resetToolBoxSizing(100); // use a short delay to ensure the DOM is fully ready (TODO: may not be necessary)
    });



}