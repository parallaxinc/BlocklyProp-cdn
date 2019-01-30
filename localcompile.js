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

// Node.js libraries
const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');

/**
 *
 * @type {string}
 */
var compiler_output = '';


/**
 *
 * @type {Array}
 */
var library_order = [];


/**
 *
 * @type {Array}
 */
var external_libraries = [];


/**
 *
 * @type {{}}
 */
var external_libraries_info = {};


/**
 *
 * @type {string}
 */
var source_directory = '';


/**
 *
 * @type {{"c-libraries": string, "c-compiler": string}}
 */
var configs = {
    'c-libraries' : "",
    'c-compiler' : ""
};


/**
 *
 * @type {Date}
 */
var tt = new Date();


/**
 *
 * @type {{shared: boolean, private: boolean, code: string, created: Date, "description-html": string, description: string, type: string, name: string, modified: Date, id: number, user: string, yours: boolean, board: string}}
 */
document.localProject = {
    'board': "activity-board",
    'code': "<xml xmlns=\"http://www.w3.org/1999/xhtml\"></xml>",
    'created': tt,
    'description': "",
    'description-html': "",
    'id': 0,
    'modified': tt,
    'name': "cool new project",
    'private': true,
    'shared': false,
    'type': "PROPC",
    'user': "offline",
    'yours': true,
};


/**
 *
 * @type {string[]}
 */
var c_cmp = ["/", "Users", os.userInfo().username, "Documents", "SimpleIDE", "Learn", "Simple Libraries"];


/**
 *
 * @type {string[]}
 */
var c_pth = ["/", "Applications", "SimpleIDE.app", "Contents", "propeller-gcc", "bin", "propeller-elf-gcc"];


if (navigator.browserSpecs.system === "Windows") {
    c_pth = ["/", "Program Files (x86)", "SimpleIDE", "propeller-gcc", "bin", "propeller-elf-gcc"];
}

if ($("meta[name=c-libraries-path]").attr("content")) {
    c_cmp = $("meta[name=c-libraries-path]").attr("content").split('|');
}

if ($("meta[name=c-compiler-path]").attr("content")) {
    c_pth = $("meta[name=c-compiler-path]").attr("content").split('|');
}


for (var i = 0; i < c_cmp.length; i++) {
    configs['c-libraries'] = path.join(configs['c-libraries'], c_cmp[i]);
}
for (var i = 0; i < c_pth.length; i++) {
    configs['c-compiler'] = path.join(configs['c-compiler'], c_pth[i]);
}

console.log(c_cmp);
console.log(c_pth);

/*
// FOR TESTING
var propLoadApp = '/Applications/BlocklyPropClient.app/Contents/Resources/propeller-tools/mac/proploader -P';

exec(propLoadApp, function(err, stdout, stderr) {
    console.log('errors: ' + err);
    console.log('stdout: ' + stdout);
    console.log('stderr: ' + stderr);
});
*/

/*
var configs = {
    'c-libraries': path.join("/", "Users", os.userInfo().username, "Documents", "SimpleIDE", "Learn", "Simple Libraries"),
    'c-compiler': path.join("/", "Applications", "SimpleIDE.app", "Contents", "propeller-gcc", "bin", "propeller-elf-gcc")
};
*/

var compile_actions = {
    "COMPILE": {"compile-options": [], "extension": ".elf", "return-binary": false},
    "BIN": {"compile-options": [], "extension": ".elf", "return-binary": true},
    "EEPROM": {"compile-options": [], "extension": ".elf", "return-binary": true}
};

function oswalk(dir, action) {
    if (typeof action !== "function") {             // Assert that it's a function
        action = function (error, file) { };
    }
    fs.readdir(dir, function (err, list) {          // Read the directory
        if (err) {
            return action(err);                     // Return the error if something went wrong
        }
        list.forEach(function (file) {              // For every file in the list
            var p = path.join(dir, file);           // Full path of that file
            fs.stat(p, function (err, stat) {       // Get the file's stats
                if (stat && stat.isDirectory()) {   // If the file is a directory
                    oswalk(p, action);              // Dive into the directory
                } else {
                    action(null, p);                // Call the action
                }
            });
        });
    });
}


/**
 *
 * @type {{}}
 */
var lib_files = {};


/**
 *
 * @type {{}}
 */
var lib_includes = {};


/**
 *
 */
oswalk(configs['c-libraries'], function(err, f) {
    if (err) {
        return err;
    }

    var pth = f.split(path.sep);
    var ext = pth[pth.length - 1].split('.');

    if ( ext[1] === 'h' || ext[1] === 'c' ) {
        let fn = pth.pop();

        // fp = pth.join('/');
        // lib_files[fn] = fp;

        lib_files[fn] = pth.join('/');

        if ( ext[1] === 'h') {
            var data = fs.readFileSync(path.join(f), "utf8");
	        lib_includes[fn] = parse_includes(data);
        }
    }
});


//FIXME: compiler says that this function is unreferenced
/**
 *
 * @param action
 * @param source_files
 * @param app_filename
 * @param lib_opt
 * @param comp_opt
 * @param callback
 */
function localCompile(action, source_files, app_filename, lib_opt, comp_opt, callback) {

    // create a temporary directory to store files
    source_directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pgc-'));

    c_file_data = {};
    h_file_data = {};

    // Write all files to working directory
    // Header files
    for (var filename in source_files) {
        if (filename.endsWith(".h")) {
            if (typeof source_files[filename] === 'string' || source_files[filename] instanceof String) {
                file_content = source_files[filename];
            } else {
                file_content = source_files[filename].stream.read();
            }

            fs.writeFileSync(path.join(source_directory, filename), file_content);

            // Check c file exists
            c_filename = filename.slice(0, -1) + 'c';
            if (source_files.toString().indexOf(c_filename) === -1) {
                return (false, null, '', '', 'Missing c file %s for header %s' % (c_filename, filename));
            }

            h_file_data[filename] = {
                'c_filename': c_filename
            };
        }
    }


    // C source files
    for (filename in source_files) {
        if (filename.endsWith(".c")) {
            var file_content = '';

            if (typeof source_files[filename] === 'string' || source_files[filename] instanceof String) {
                file_content = source_files[filename];
            } else {
                file_content = source_files[filename].stream.read();
            }
	
            fs.writeFileSync(path.join(source_directory, filename), file_content);

            c_file_data[filename] = {
                'includes': parse_includes(file_content)
            };

            // Check header file exists
            h_filename = filename.slice(0, -1) + 'h';
            if (source_files.toString().indexOf(h_filename) !== -1) {
                c_file_data[filename]['library'] = true;
            } else {
                c_file_data[filename]['library'] = false;
            }
        }
    }

    compiler_output = '';
    library_order = [];
    external_libraries = [];
    external_libraries_info = {};

    // determine order and direct library dependencies
    for (var i = 0; i < c_file_data[app_filename]['includes'].length; i++) {
        determine_order(c_file_data[app_filename]['includes'][i], h_file_data, c_file_data);
    }

    // determine library dependencies
    for (var l = 0; l < external_libraries.length; l++) {
        find_dependencies(external_libraries[l]);
    }

    if (external_libraries.length > 0) {
        compiler_output += "Included libraries: " + external_libraries.join(', ') + "\n";
    }

    // TODO: determine if the following statement and executing_data need adjusting when multi-file projects are enabled
    if (library_order.length > 0) {
        compiler_output += "Library compile order: " + library_order.join(', ') + "\n";
    }

    success = true;
/*
    // TODO: Promisify to make sure this all executes?
    // Precompile libraries
    for (var l = 0; l < library_order.length; l++) {
	compile_lib(source_directory, library_order[l] + '.c', library_order[l] + '.o', external_libraries_info, lib_opt, function(output) {
		console.log(output);
        });

    }
*/

    if (success) {
        compile_binary(source_directory, action, app_filename, library_order, external_libraries_info, comp_opt, function(output) {
            return callback(output);
        });
    }
}


// TODO: put this in all error handlers
/**
 *
 * @param sd
 */
function cleanUpAll(sd) {
    // delete the temp directory
    deleteFolderRecursive(sd);  
    
    // empty variables
    compiler_output = '';
    library_order = [];
    external_libraries = [];
    external_libraries_info = {};
    source_directory = '';
}


/**
 *
 * @param header_file
 * @param header_files
 * @param c_files
 */
function determine_order(header_file, header_files, c_files) {

    if (library_order.toString().indexOf(header_file) === -1) {

        // TODO review to check what happens if no header supplied (if that is valid)
        if (header_files.toString().indexOf(header_file + '.h') > -1) {
            var includes = c_files[header_files[header_file + '.h']['c_filename']]['includes'];

            for (var include in includes) {
                determine_order(include, header_files, c_files);
            }

            library_order.push(header_file);

        } else {
            if (external_libraries.toString().indexOf(header_file) === -1) {
                external_libraries.push(header_file);
            }
        }
    }
}


/**
 *
 * @param library
 */
var find_dependencies = function(library) {
    for (var files in lib_files) {
        if (files.indexOf(library + '.h') > -1) {
            if (lib_files[files].indexOf('/lib' + library) > -1) {

                external_libraries_info[library] = lib_files[files];
		        library_order.push(library);

                var includes = lib_includes[files];

                for (var i = 0; i < includes.length; i++) {

                    if (Object.keys(external_libraries_info).toString().indexOf(includes[i]) === -1) {
                        find_dependencies(includes[i]);
                    }
                }
            }
        }
    }
};


/**
 *
 * @param working_directory
 * @param source_file
 * @param target_filename
 * @param libraries
 * @param lib_opt
 * @param callback
 */
function compile_lib(working_directory, source_file, target_filename, libraries, lib_opt, callback) {
    var out_text = working_directory + ' -> Compiling ' + source_file + ' into ' + target_filename + '\n';

    executing_data = create_lib_executing_data(source_file, target_filename, libraries, lib_opt);  // build execution command
    out_text += executing_data.join(' ');

    // TODO: find a better way to handle spaces in the directory names
    exec(executing_data.join(' ').replace(/\/Simple Libraries\//g, "/'Simple Libraries'/"), { 'cwd' : working_directory }, function(err, stdout, stderr) {
 
    // TODO: clean up callbacks - send object? Promisify? Both?       
        if (err) {
            
            // node couldn't execute the command
            cleanUpAll(source_directory);
            return callabck([false, "", "Compiler not found\n"]);
        }

        // TODO: handle compiler output...?

        // the *entire* stdout and stderr (buffered)
        console.log(stdout);
        console.log(stderr);

        cleanUpAll(source_directory);
        return callback([true, "Library compile successful\n", null]);
    });   
}


/**
 *
 * @param working_directory
 * @param action
 * @param source_file
 * @param binaries
 * @param libraries
 * @param comp_opt
 * @param callback
 */
function compile_binary(working_directory, action, source_file, binaries, libraries, comp_opt, callback) {
    
    var file_out = 'usr' + (Math.random().toString(36).substring(2, 10)) + 'pgc' + compile_actions[action.toUpperCase()]["extension"];
    var binary_file = path.join(working_directory, file_out);
    
    var out_text = '';

    executing_data = create_executing_data(path.join(source_directory, source_file), binary_file, binaries, libraries, comp_opt);  // build execution command
    out_text += executing_data.join(' ');
    
    // Create a new tempfile and open it for writing
    fs.open(binary_file, 'w+', (err, fd) => {
        
        // create an arraybuffer
        var u8buff = new Uint8Array;   
        
        if (err) {
            
            // node couldn't open a temp file
            cleanUpAll(source_directory);
            var data = {
                error:      err,
                'message':  "Unable to open binary file.",
                success:    false,
                binary:     null,
                extension:  null
            }
            return callback(data);  
        }
        
        // TODO: find a better way to handle spaces in the directory names
        exec(executing_data.join(' ').replace(/\/Simple Libraries\//g, "/'Simple Libraries'/"), { 'cwd' : working_directory }, function(err, stdout, stderr) {

            var data = {
                error:      stderr,
                details:    stdout,
                message:    "Compiler not found.",
                success:    false,
                binary:     null,
                extension:  null
            }

            if (err) {

                // node couldn't execute the command
                cleanUpAll(source_directory);
		        data.error = err;
		        data['message'] = "Compiler Error: " + stdout + "\n\n" + stderr;
   	            return callback(data);  
            }

            // the *entire* stdout and stderr (buffered)
            data['message'] = "Compile successful!";
            data.details = stdout;
	        data.success = true;
	        data.extension = compile_actions[action.toUpperCase()]["extension"];
            
            if (compile_actions[action.toUpperCase()]["return-binary"]) {
                
                // Read binary file into base64 string
                fs.readFile(fd, function(err, u8buff) {

                    if (err) {
		                cleanUpAll(source_directory);
			            data.error = err;
			            data['message'] = "Unable to read compiled file: " + stdout + "\n\n" + stderr;
   	                    return callback(data);  
                    }

		            data.binary = _arrayBufferToBase64( u8buff );

                    // Return results
                    cleanUpAll(source_directory);
   	                return callback(data);  
                });
            } else {

                // Return results
                cleanUpAll(source_directory);
                return callback(data);  
            }  
        });
    });
}


/**
 *
 * @param pth
 */
function deleteFolderRecursive(pth) {
    // make sure it is our directory we are deleting
    if (fs.existsSync(pth) && pth.indexOf('pgc-') > -1) {
        fs.readdirSync(pth).forEach(function(fl, index) {
            var curPath = path.join(pth, fl);
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(pth);
    }
};


/**
 *
 * @param buffer
 * @returns {string}
 * @private
 */
function _arrayBufferToBase64( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
}


/**
 *
 * @param source_file
 * @returns {Array}
 */
function parse_includes(source_file) {
    icl = [];

    source_file.replace(/#include[ ]+["<](\w+).h[">]/g, function(m, p){
        icl.push(p); 
    });

    return icl;
}


/**
 *
 * @param lib_c_file_name
 * @param binary_file
 * @param descriptors
 * @param lib_opt
 * @returns {*[]|*}
 */
function create_lib_executing_data(lib_c_file_name, binary_file, descriptors, lib_opt) {
    executable = configs['c-compiler'];

    executing_data = [executable];
    executing_data.push("-I");
    executing_data.push(".");
    executing_data.push("-L");
    executing_data.push(".");
    for (var descriptor in descriptors) {
        executing_data.push("-I");
        executing_data.push(descriptors[descriptor]);
        executing_data.push("-L");
        executing_data.push(descriptors[descriptor] + '/cmm');
    }
    executing_data.push(lib_opt || "-O0");
    executing_data.push("-mcmm");
    executing_data.push("-m32bit-doubles");
    executing_data.push("-std=c99");
    executing_data.push("-c");
    executing_data.push(lib_c_file_name);
    executing_data.push("-o");
    executing_data.push(binary_file);

    return executing_data;
}


/**
 *
 * @param main_c_file_name
 * @param binary_file
 * @param binaries
 * @param descriptors
 * @param comp_opt
 * @returns {*[]|*}
 */
function create_executing_data(main_c_file_name, binary_file, binaries, descriptors, comp_opt) {
    executable = configs['c-compiler'];

    executing_data = [executable];
    executing_data.push("-I");
    executing_data.push(".");
    executing_data.push("-L");
    executing_data.push(".");
    for (var descriptor in descriptors) {
        executing_data.push("-I");
        executing_data.push(descriptors[descriptor]);
        executing_data.push("-L");
        executing_data.push(descriptors[descriptor] + '/cmm');
    }
    executing_data.push("-o");
    executing_data.push(binary_file);
    executing_data.push(comp_opt || "-O0");
    executing_data.push("-mcmm");
    executing_data.push("-m32bit-doubles");
    executing_data.push("-std=c99");
/*
    for (var b = 0; b < binaries.length; b++) {
        executing_data.push(binaries[b] + ".o");
    }
*/
    executing_data.push(main_c_file_name);
    executing_data.push("-Wl,--start-group");
    executing_data.push("-lm");
    var libraries = Object.keys(descriptors);

    for (var l = 0; l < libraries.length; l++) {
        executing_data.push("-l" + libraries[l]);
    }
    executing_data.push("-Wl,--end-group");

    return executing_data;
}


/**
 *
 * @param filename
 * @param file_content
 */
var localSaveAs = function(filename, file_content) {
    // TODO: Switch this to ASYNC and add error reporting
    fs.writeFileSync(filename, file_content);
}


/**
 *
 * @param filenames
 * @param file_contents
 */
var localSaveMultiplefiles = function(filenames, file_contents) {
    for (var idx = 0; idx < filenames.length; idx++) {
        // TODO: Switch this to ASYNC and add error reporting
        fs.writeFileSync(filenames[idx], file_contents[idx]);
    }
}