
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
 * Project language types
 *
 * @type {{PROPC: {editor: string, class: string}, SPIN: {editor: string, class: string}}}
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
 * Suppoted project board types
 *
 * @type {{"activity-board": string, s3: string, heb: string, "heb-wx": string, flip: string, other: string, propcfile: string}}
 */
var projectBoard = {
    "activity-board": "icon-board-ab",
    "s3": "icon-board-s3",
    "heb": "icon-board-heb",
    "heb-wx": "icon-board-heb-wx",
    "flip": "icon-board-flip",
    "other": "icon-board-other",
    "propcfile": "icon-board-propc"
};


/**
 * Get a list of the five most recent projects and create an ordered list
 * expressed in HTML
 *
 *  Example row returned is:
 *       {
 *           "id": 2192,
 *           "name": "28504 - GPS Test",
 *           "description": "",
 *           "type": "PROPC",
 *           "board": "flip",
 *           "private": false,
 *           "shared": true,
 *           "created": "2019/04/10 12:25",
 *           "modified": "2019/05/01 12:42",
 *           "settings": null,
 *           "yours": false,
 *           "user": "VonSzarvas",
 *           "id-user": 131
 *       }
 */
$.get("rest/shared/project/list?sort=modified&order=desc&limit=5&offset=0", function (data) {
    $.each(data['rows'], function (index, project) {
        console.log(project);
        var user = '';
        if (project['user']) {
            user = ' (' + project['user'] + ')';
        }
        var projectItem = $("<li/>", {
            "class": "project"
        });
        $("<a/>", {
            "class": "editor-view-link editor-icon " + projectBoard[project['board']],
            "href": "editor/" + projectTypes[project['type']]['editor'] + "?project=" + project['id'],
            "text": project['name'] + user
        }).appendTo(projectItem);
        $(".latest-projects").append(projectItem);
    });
});
