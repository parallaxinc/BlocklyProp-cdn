
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
 * @type {*|jQuery}
 */
var baseUrl = $("meta[name=base]").attr("content");


/**
 *
 * @type {string}
 */
var cloneUrl = '';


/**
 *
 * @type {string}
 */
var deleteUrl = '';


/**
 *
 * @type {string}
 */
var linkShareUrl = '';


/**
 *
 * @type {null}
 */
var idProject = null;


/**
 *
 * @type {{SPIN: {editor: string, class: string}, PROPC: {editor: string, class: string}}}
 */
var projectTypes = {
    "PROPC": {
        "editor": "blocklyc.jsp",
        "class": "editor-c-link"
    },
    "SPIN": {
        "editor": "blocklyc.jsp",
        "class": "editor-c-link"
    }
};


/**
 *
 * @type {null}
 */
var simplemde = null;


/**
 *
 */
$(document).ready(function () {
    simplemde = new SimpleMDE({
        element: document.getElementById("project-form-description"),
        hideIcons: ["link"],
        spellChecker: false
    });

    cloneUrl = $('.clone-project').data('href');
    deleteUrl = $('.delete-project').data('href');
    linkShareUrl = $('#project-link-share').data('href');

    if (window.location.hash && window.location.hash !== "#") {
        loadProject(window.location.hash.substr(1));
        $("#project-form-container").addClass('in');
        }
    else {
        $("#project-table-container").addClass('in');
        }

    $(window).on('hashchange', function () {
        if (window.location.hash && window.location.hash !== "#") {
            showProject(window.location.hash.substr(1));
            }
        else {
            showTable();
        }
    });

    $('#project-form').ajaxForm({
        'beforeSerialize': function () {
            $("#project-form-description").val(simplemde.value());
            $("#project-form-description-html").val(simplemde.options.previewRender(simplemde.value()));
        },
        'success': function () {
            $(".project-changed:not(.hidden)").remove();
            var projectChanged = $(".project-changed").clone().insertAfter(".project-changed");
            projectChanged.removeClass("hidden");
            projectChanged.delay(5000).fadeOut(400, function () {
                projectChanged.remove();
            });
        }
    });

    $("#project-delete").click(function (e) {
        e.preventDefault();
        $("#project-delete-confirm").modal('show');
    });

    $("#project-delete-confirmed").click(function () {
        window.location.href = $('.delete-project').attr('href');
    });

    $("#project-link-share-enable").click(function () {
        var linkShareInput = $("#project-link-share");
        if ($(this).prop('checked')) {
            $.post(baseUrl + "projectlink", {'id': idProject, 'action': 'share'}, function (response) {
                if (response['success']) {
                    linkShareInput.val(window.location.origin + linkShareUrl + idProject + "&key=" + response['share-key']);
                    linkShareInput.focus();
                    linkShareInput[0].setSelectionRange(0, linkShareInput.val().length);
                    linkShareInput.tooltip();
                    linkShareInput.tooltip('show');

                    $('.not-shared-project').addClass('hidden');
                    $('.shared-project').removeClass('hidden');
                }
            });


        } else {
            $.post(baseUrl + "projectlink", {'id': idProject, 'action': 'revoke'}, function (response) {
                if (response['success']) {
                    linkShareInput.tooltip('destroy');
                    linkShareInput.val('');

                    $('.not-shared-project').removeClass('hidden');
                    $('.shared-project').addClass('hidden');
                }
            });
        }
    });

    $("#project-link-share").click(function () {
        var linkShareInput = $("#project-link-share");
        linkShareInput[0].setSelectionRange(0, linkShareInput.val().length);
    });

    /* --------------------------------------------------------------
     * Add a "Download My Projects" button at the top of the my
     * projects page to support bulk project downloads.
     * ------------------------------------------------------------*/
    if (window.location.href.indexOf('my/projects.jsp') > -1) {
        initBulkProjectDownloadButton();
    }
});


/**
 *
 */
function showTable() {
    $("#project-table").bootstrapTable('refresh');
    $("#project-table-container").collapse('show');
    $("#project-form-container").collapse('hide');
}


/**
 *
 * @param idProject
 */
function showProject(idProject) {
    // Clear form
    $(".sharing").removeProp('checked').parent().removeClass('active');
    $('.your-project').addClass('hidden');
    $('.not-your-project').addClass('hidden');
    $('.not-shared-project').addClass('hidden');
    $('.shared-project').addClass('hidden');

    loadProject(idProject);
    $("#project-table-container").collapse('hide');
    $("#project-form-container").collapse('show');
}


/**
 *
 * @param idProject
 */
function loadProject(idProject) {
    window.idProject = idProject;

    var linkShareInput = $("#project-link-share");
    linkShareInput.tooltip('destroy');
    linkShareInput.val('');
    $("#project-link-share-enable").prop('checked', false);

    // Get details
    $.get(baseUrl + "rest/shared/project/get/" + idProject, function (project) {
        if (project['yours']) {
            $('.your-project').removeClass('hidden');

            if (project['share-key']) {
                $("#project-link-share-enable").prop('checked', true);
                linkShareInput.val(window.location.origin + linkShareUrl + idProject + "&key=" + project['share-key']);
                linkShareInput.tooltip();

                $('.shared-project').removeClass('hidden');
            } else {
                $('.not-shared-project').removeClass('hidden');
            }
        } else {
            $('.not-your-project').removeClass('hidden');
            $("#project-form-user").val(project['user']);
        }
        $("#project-form-id").val(project['id']);
        $("#project-form-name").val(project['name']);

        var boardTranslation = boards[project['board']];
        if (!boardTranslation) {
            boardTranslation = boards['other'];
        }
        $("#project-form-board").val(boardTranslation);
        $("#project-form-created").val(project['created']);
        $("#project-form-modified").val(project['modified']);
        simplemde.value(project['description']);
        $("#project-description-html").html(project['description-html']);
        if (project['private']) {
            $("#project-form-private").prop('checked', 'checked').parent().addClass('active');
        } else if (project['shared']) {
            $("#project-form-shared").prop('checked', 'checked').parent().addClass('active');
        } else {
            $("#project-form-private").prop('checked', 'checked').parent().addClass('active');
            //$("#project-form-friends").prop('checked', 'checked').parent().addClass('active');
        }


        var openProjectLink = $("a.open-project-link");
        openProjectLink.removeClass("editor-c-link editor-spin-link");
        openProjectLink.attr("href", baseUrl + "editor/" + projectTypes[project['type']]['editor'] + "?project=" + project['id']);
        $('.clone-project').attr('href', cloneUrl + project['id']);
        $('.delete-project').attr('href', deleteUrl + project['id']);
        openProjectLink.addClass(projectTypes[project['type']]['class']);
    });
}


/**
 *
 * @returns {string}
 */
function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
}


/**
 * Generates a hash of a string - used to generate a checksum for the blocks (SVG) file
 * @param str string used to generate a hash
 * @returns {integer}
 */
function hashCode(str) {
    let hash = 0,
        i = 0,
        len = str.length;
    while (i < len) {
        hash = ((hash << 5) - hash + str.charCodeAt(i++)) << 0;
    }
    return (hash + 2147483647) + 1;
}

/**
 * Encodes XML-illegal characters in a string to their legal encoded versions
 * @param str XML-as-a-string to encode
 * @returns XML-safe string
 */
function encodeToValidXml(str) {
    return (str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\t/g, '&#x9;')
        .replace(/\n/g, '&#xA;')
        .replace(/\r/g, '&#xD;')
    );
}


/* ------------------------------------------------------------------
 * Bulk Project Download Feature
 * ----------------------------------------------------------------*/
var theFileList = [];
var zip = new JSZip();
var theFolder = zip.folder('BlocklyPropFiles');
var projCount = 0;
var projectsCounted = false;
var excludedProjects = [];

/**
 * Function called by the Download My Projects button
 */
function startProjectsDownload() {
    $('#downloadProjectButton')
        .removeClass('btn-primary')
        .addClass('btn-info')
        .html('Fetching your projects...')
        .off('click')
        .blur();
    getSomeProjects(0);
    $('#removed-projects').html('<b>The following projects were excluded because they are empty:</b>');
}


/**
 * Retrives a chunk of a user's projects and passes them on for processing.
 */
function getSomeProjects(listOffset) {
    $.get(baseUrl + "rest/project/list?limit=20&offset=" + (listOffset ? listOffset : 0).toString(10), function () {}).done(function (data) {
        if (!projectsCounted) {
            projCount = parseInt(data.total);
            projectsCounted = true;
        }
        var pList = data.rows;
        for (var i = 0; i < pList.length - 1; i++) {
            processProjectData(pList[i].id);
        }
        processProjectData(pList[pList.length - 1].id, listOffset + 20, pList.length < 20 ? 'final' : 'last');
    }).fail(function (err) {
        $("#downloadProjectButton")
            .removeClass('btn-info')
            .addClass('btn-danger')
            .off('click')
            .html(err + ' - Try refreshing the page.');
    });
}

/**
 * Retrieves a project's code and compiles it, along with the other projects into a single .zip file.
 * @param projectId id of the project to retrieve.
 * @param listOffset offset used by the callback to begin retriving the next set of projects.
 * @param callbackTrigger populated when the last project in the group, 
 * and the last project in the whole set are all retrieved.
 */
function processProjectData(projectId, listOffset, callbackTrigger) {
    $.get(baseUrl + 'rest/shared/project/editor/' + projectId, function () {}).done(function (ddd) {
        // Flag invalid project data elements
        var validProject = false;

        var project_filename;
        var projXMLcode;
        var svgBase = '<svg blocklyprop="blocklypropproject" xmlns="http://www.w3.org/2000/svg" xmlns:html="http://www.w3.org/1999/xhtml" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" height="240" width="480" style="font-family:Arial, Helvetica, sans-serif;font-size:20px;"><rect width="480" height="110" style="fill:#eee;stroke:none;" /><text x="100" y="25" fill="#339">NOTE: To convert this file to an SVG</text><text x="100" y="50" fill="#339">image that shows an image of the</text><text x="100" y="75" fill="#339">blocks, open the file in BlocklyProp</text><text x="100" y="100" fill="#339">and resave it as a new file.</text><image height="80" width="80" x="10" y="15" href="data:image/png;base64,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"></image>';

        // Catch a project that contains a null project name
        if (ddd && ddd.name) {
            validProject = true;
            project_filename = ddd.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            projXMLcode = ddd.code.substring(42, ddd.code.length);
            projXMLcode = projXMLcode.substring(0, (projXMLcode.length - 6));
        }

        //Weed out empty files
        if (validProject && projXMLcode.length > 3) {
            // a footer to generate a watermark with the project's information at the bottom-right corner of the SVG
            // and hold project metadata.
            var SVGfooter = createSvgFooter(ddd.user, ddd.name, ddd.board, ddd.description, ddd.created, ddd.modified);

            // Check to make sure the filename is not too long
            if (project_filename.length >= 23) {
                project_filename = project_filename.substring(0, 22);
            }
            project_filename += '(' + ddd.id.toString(10) + ')';

            // Compute a faux checksum
            var xmlChecksum = hashCode(projXMLcode).toString();
            xmlChecksum = '000000000000'.substring(xmlChecksum.length, 12) + xmlChecksum;

            // Assemble both the SVG (image) of the blocks and the blocks' XML definition
            theFolder.file(
                project_filename + '.svge',
                svgBase + SVGfooter + projXMLcode + '<ckm>' + xmlChecksum + '</ckm></svg>');
            theFileList.push(
                [
                    [svgBase + SVGfooter + projXMLcode + '<ckm>' + xmlChecksum + '</ckm></svg>'],
                    [project_filename + '.svge']
                ]);
        } else {
            projCount--;

            // Add project to excluded list
            excludedProjects.push([ddd.id.toString(10), ddd.name]);
        }
        if (callbackTrigger == 'final') {
            processFileList();
        } else if (callbackTrigger == 'last') {
            getSomeProjects(listOffset);
        }
    }).fail(function (err) {
        $("#downloadProjectButton")
            .removeClass('btn-info')
            .addClass('btn-danger')
            .off('click')
            .html(err + ' - Try refreshing the page.');
    });
}


/**
 * Monitors and reports the progress of the file retreivals and when finished, 
 * triggers the download to the users computer.
 */
function processFileList() {
    $('#downloadProjectButton')
        .html('Processing projects...');
    var ci = setInterval(function () {
        if (theFileList.length === projCount && projCount > 0) {
            // reset the timer
            clearInterval(ci);

            // Add the excluded files to the folder
            appendExcludedProjectsReport();

            zip.generateAsync( { type: "blob" } )
                .then(function (blob) { // 1) generate the zip file
                    $('#downloadProjectButton')
                        .removeClass('btn-info')
                        .addClass('btn-success')
                        .html('Ready! Downloading...');
                    saveAs(blob, "BlocklyPropProjects.zip"); // 2) trigger the download
                    setTimeout(function () {
                        hideEmptyProjectList();         // Clean up the UI
                    }, 2000);
                }, function (err) {
                    $("#downloadProjectButton")
                        .removeClass('btn-info')
                        .addClass('btn-danger')
                        .html(err);
                }); // end of then clause
        }
    }, 1000);
}

// Empty and hide the failed project list
// Reset the download button
function hideEmptyProjectList() {
    // Clear the list of excluded projects
    $('#removed-projects')
        .html(' ')
        .addClass('hidden');

    // Update the button to pre-download defaults
    $('#downloadProjectButton')
        .removeClass('btn-success')
        .addClass('btn-primary')
        .html('Download My Projects')
        .on('click', startProjectsDownload);

    // Reset the exporter variables
    theFileList = [];
    zip = new JSZip();
    theFolder = zip.folder('BlocklyPropFiles');
    projCount = 0;
    projectsCounted = false;
    excludedProjects = [];

}

function initBulkProjectDownloadButton() {
    let htmlText =
        '<button id="downloadProjectButton" class="btn btn-primary">Download My Projects</button>' +
        '<div id="removed-projects" class="alert alert-warning hidden" role="alert" style="margin-top:15px;">' +
        '<b>The following projects were excluded because they are empty:</b></div>';

    $('.col-md-12')
        .first()
        .prepend(htmlText);
    $('#downloadProjectButton').on('click', startProjectsDownload);
}


function createSvgFooter(user, name, board, description, dateCreated, dateModified) {
    var SVGfooter = '<text style="font-size:10px;fill:#555;" x="20" y="140">Parallax BlocklyProp Project</text>';
    SVGfooter += '<text style="font-size:10px;fill:#555;" x="20" y="155">User: ' + encodeToValidXml(user) + '</text>';
    SVGfooter += '<text style="font-size:10px;fill:#555;" x="245" y="223" transform="translate(-225,-53)">Title: ' + encodeToValidXml(name) + '</text>';
    SVGfooter += '<text style="font-size:10px;fill:#555;" x="245" y="208" transform="translate(-225,-23)">Device: ' + board + '</text>';
    SVGfooter += '<text style="font-size:10px;fill:#555;" x="245" y="208" transform="translate(-225,-8)">Description: ' + encodeToValidXml(description) + '</text>';
    SVGfooter += '<text style="font-size:10px;fill:#555;" x="20" y="215" data-createdon="' + dateCreated + '" data-lastmodified="' + dateModified + '"></text>';

    return SVGfooter;
}


/*
 * Create a human-readable text file that enumerates the projects
 * that were excluded from the export because they were empty or
 * invalid.
 */
function appendExcludedProjectsReport() {
    // Return if there is nothing to do
    if (excludedProjects.length === 0) {
        return;
    }

    let result = "The following project(s) were not exported because they are empty or invalid:\n";
    let name = "";

    // Enumerate the list
    excludedProjects.forEach(function(item) {
        name = item[1] ? item[1] : "Unknown";
        result = result + "ID: " +  item[0].toString() + "\tName: " + item[1] + "\n";
    });

    // Add the results to the folder
    theFolder.file("ExcludedProject.txt", result);
}