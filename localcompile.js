// Node.js libraries
const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');


var compiler_output = '';
var library_order = [];
var external_libraries = [];
var external_libraries_info = {};
var source_directory = '';

var configs = {
    'c-libraries' : "",
    'c-compiler' : ""
};

var tt = new Date();
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
}

var c_cmp = ["/", "Users", "mmatz", "Documents", "SimpleIDE", "Learn", "Simple Libraries"];
for (var i = 0; i < c_cmp.length; i++) {
    configs['c-libraries'] = path.join(configs['c-libraries'], c_cmp[i]);
}
var c_pth = ["/", "Applications", "SimpleIDE.app", "Contents", "propeller-gcc", "bin", "propeller-elf-gcc"];
for (var i = 0; i < c_pth.length; i++) {
    configs['c-compiler'] = path.join(configs['c-compiler'], c_pth[i]);
}

/*
var configs = {
    'c-libraries': path.join("/", "Users", "mmatz", "Documents", "SimpleIDE", "Learn", "Simple Libraries"),
    'c-compiler': path.join("/", "Applications", "SimpleIDE.app", "Contents", "propeller-gcc", "bin", "propeller-elf-gcc")
};
*/

var compile_actions = {
    "COMPILE": {"compile-options": [], "extension": ".elf", "return-binary": false},
    "BIN": {"compile-options": [], "extension": ".elf", "return-binary": true},
    "EEPROM": {"compile-options": [], "extension": ".elf", "return-binary": true}
};


function oswalk(dir, action) {
    
    // Assert that it's a function
    if (typeof action !== "function") {
        action = function (error, file) { };
    }

    // Read the directory
    fs.readdir(dir, function (err, list) {
        
        // Return the error if something went wrong
        if (err) {
            return action(err);
        }

        // For every file in the list
        list.forEach(function (file) {
            
            // Full path of that file
            var p = path.join(dir, file);
            
            // Get the file's stats
            fs.stat(p, function (err, stat) {
                
                // If the file is a directory
                if (stat && stat.isDirectory()) {
                    
                    // Dive into the directory
                    oswalk(p, action);
                    
                } else {
                    
                    // Call the action
                    action(null, p);
                }
            });
        });
    });
};

var lib_files = {};
var lib_includes = {};

oswalk(configs['c-libraries'], function(err, f) {
    if (err) {
        return err;
    }

    var pth = f.split(path.sep);
    var ext = pth[pth.length - 1].split('.');
    if( ext[1] === 'h' || ext[1] === 'c' ) {
        fn = pth.pop();
        fp = pth.join('/');
        lib_files[fn] = fp;
        if ( ext[1] === 'h') {
            var data = fs.readFileSync(path.join(f), "utf8")
	    lib_includes[fn] = parse_includes(data);
        }
    }
});


function localCompile(action, source_files, app_filename, callback) {

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
	compile_lib(source_directory, library_order[l] + '.c', library_order[l] + '.o', external_libraries_info, function(output) {
		console.log(output);
        });

    }
*/

    if (success) {
	compile_binary(source_directory, action, app_filename, library_order, external_libraries_info, function(output) {
		return callback(output);
	});
    }
}

// TODO: put this in all error handlers
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

//219
//186

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

function compile_lib(working_directory, source_file, target_filename, libraries, callback) {
    var out_text = working_directory + ' -> Compiling ' + source_file + ' into ' + target_filename + '\n';

    executing_data = create_lib_executing_data(source_file, target_filename, libraries);  // build execution command
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
        //console.log('stdout: ${stdout}');
        //console.log('stderr: ${stderr}');

        cleanUpAll(source_directory);
        return callback([true, "Library compile successful\n", null]);
    });   
}

function compile_binary(working_directory, action, source_file, binaries, libraries, callback) {
    
    var file_out = 'usr' + (Math.random().toString(36).substring(2, 10)) + 'pgc' + compile_actions[action.toUpperCase()]["extension"];
    var binary_file = path.join(working_directory, file_out);
    
    var out_text = '';

    executing_data = create_executing_data(path.join(source_directory, source_file), binary_file, binaries, libraries);  // build execution command
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
		error:      null,
		'message':  "Compiler not found.",
		success:    false,
		binary:     null,
		extension:  null
	    }

            if (err) {

                // node couldn't execute the command
                cleanUpAll(source_directory);
		data.error = err;
		data['message'] = "Compiler not found.";
   	        return callback(data);  
            }

            // the *entire* stdout and stderr (buffered)
            //console.log('stdout: ${stdout}');
            //console.log('stderr: ${stderr}');
            
            data['message'] = "Compile successful!";
	    data.success = true;
	    data.extension = compile_actions[action.toUpperCase()]["extension"];
            
            if (compile_actions[action.toUpperCase()]["return-binary"]) {
                
                // Read binary file into base64 string
                fs.readFile(fd, function(err, u8buff) {

                    if (err) {
		        cleanUpAll(source_directory);
			data.error = err;
			data['message'] = "Unable to read compiled file.";
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

function deleteFolderRecursive(pth) {

  // make sure it is our directory we are deleting
  if (fs.existsSync(pth) && pth.indexOf('pgc-') > -1) {
    fs.readdirSync(pth).forEach(function(fl, index){
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

function _arrayBufferToBase64( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
}

function parse_includes(source_file) {
    icl = [];

    source_file.replace(/#include[ ]+["<](\w+).h[">]/g, function(m, p){
        icl.push(p); 
    });

    return icl;
}

function create_lib_executing_data(lib_c_file_name, binary_file, descriptors) {
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
    executing_data.push("-O0");
    executing_data.push("-mcmm");
    executing_data.push("-m32bit-doubles");
    executing_data.push("-std=c99");
    executing_data.push("-c");
    executing_data.push(lib_c_file_name);
    executing_data.push("-o");
    executing_data.push(binary_file);

    return executing_data;
}

function create_executing_data(main_c_file_name, binary_file, binaries, descriptors) {
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
    executing_data.push("-O0");
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

