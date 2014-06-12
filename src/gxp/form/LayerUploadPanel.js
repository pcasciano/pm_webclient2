Ext.define('gxp.data.DataStore', {
    extend: 'Ext.data.Model',
    fields: [
        "name",
        "href"
    ]
});

Ext.define('gxp.form.LayerUploadPanel', {
    extend: 'Ext.form.Panel',
    requires: ['Ext.data.JsonStore', 'Ext.form.field.File'],
    alias: 'widget.gxp_layeruploadpanel',
    titleLabel: "Title",
    titleEmptyText: "Layer title",
    abstractLabel: "Description",
    abstractEmptyText: "Layer description",
    fileLabel: "Data",
    fieldEmptyText: "Browse for data archive...",
    uploadText: "Upload",
    uploadFailedText: "Upload failed",
    processingUploadText: "Processing upload...",
    waitMsgText: "Uploading your data...",
    invalidFileExtensionText: "File extension must be one of: ",
    optionsText: "Options",
    workspaceLabel: "Workspace",
    workspaceEmptyText: "Default workspace",
    dataStoreLabel: "Store",
    dataStoreEmptyText: "Choose a store",
    dataStoreNewText: "Create new store",
    crsLabel: "CRS",
    crsEmptyText: "Coordinate Reference System ID",
    invalidCrsText: "CRS identifier should be an EPSG code (e.g. EPSG:4326)",
    validFileExtensions: [".zip", ".tif", ".tiff", ".gz", ".tar.bz2", ".tar", ".tgz", ".tbz2"],
    defaultDataStore: null,
    selectedWorkspace: null,
    constructor: function(config) {
        config.errorReader = {
            isReader: true,
            read: config.handleUploadResponse || Ext.bind(this.handleUploadResponse, this)
        };
        this.callParent(arguments);
    },
    initComponent: function() {
        this.items = [{
            xtype: "textfield",
            name: "title",
            fieldLabel: this.titleLabel,
            emptyText: this.titleEmptyText,
            allowBlank: true
        }, {
            xtype: "textarea",
            name: "abstract",
            fieldLabel: this.abstractLabel,
            emptyText: this.abstractEmptyText,
            allowBlank: true
        }, {
            xtype: "fileuploadfield",
            id: "file",
            anchor: "90%",
            emptyText: this.fieldEmptyText,
            fieldLabel: this.fileLabel,
            name: "file",
            buttonText: "",
            buttonConfig: {
                iconCls: "gxp-icon-filebrowse"
            },
            listeners: {
                "fileselected": function(cmp, value) {
                    // remove the path from the filename - avoids C:/fakepath etc.
                    cmp.setValue(value.split(/[/\\]/).pop());
                }
            },
            validator: Ext.bind(this.fileNameValidator, this)
        }, {
            xtype: "fieldset",
            ref: "optionsFieldset",
            title: this.optionsText,
            checkboxToggle: true,
            collapsed: true,
            hidden: this.store != undefined && this.crs != undefined,
            hideMode: "offsets",
            defaults: {
                anchor: "97%"
            },
            items: [
                this.createWorkspacesCombo(),
                this.createDataStoresCombo(),
                {
                    xtype: "textfield",
                    name: "nativeCRS",
                    // anchor: "90%",
                    fieldLabel: this.crsLabel,
                    emptyText: this.crsEmptyText,
                    allowBlank: true,
                    regex: /^epsg:\d+$/i,
                    regexText: this.invalidCrsText
                }
            ],
            listeners: {
                collapse: function(fieldset) {
                    // reset all combos
                    fieldset.items.each(function(item) {
                        item.reset();
                    });
                }
            }
        }];

        this.buttons = [{
            text: this.uploadText,
            handler: function() {
                var form = this.getForm();
                if (form.isValid()) {
                    var fields = form.getFieldValues(),
                        jsonData = {'import': {}};
                    if (fields.workspace) {
                        jsonData["import"].targetWorkspace = {workspace: {name: fields.workspace}};
                    }
                    if (Ext.isEmpty(fields.store) && this.defaultDataStore) {
                        jsonData["import"].targetStore = {dataStore: {name: this.defaultDataStore}};
                    } else if (!Ext.isEmpty(fields.store) && fields.store !== this.dataStoreNewText) {
                        jsonData["import"].targetStore = {dataStore: {name: fields.store}};
                    }
                    Ext.Ajax.request({
                        url: this.getUploadUrl(),
                        method: "POST",
                        jsonData: jsonData,
                        success: function(options, success, response) {
                            this._import = response.getResponseHeader("Location");
                            this.down('*[ref=optionsFieldset]').expand();
                            form.submit({
                                url: this._import + "/tasks?expand=all",
                                waitMsg: this.waitMsgText,
                                waitMsgTarget: true,
                                reset: true,
                                scope: this
                            });
                        },
                        scope: this
                    });
                }
            },
            scope: this
        }];

        this.addEvents(
            "workspaceselected",
            "datastoreselected",
            "uploadcomplete"
        );

        this.getDefaultDataStore('default');
        this.callParent(arguments);
    },
    fileNameValidator: function(name) {
        var valid = false;
        var ext, len = name.length;
        for (var i=0, ii=this.validFileExtensions.length; i<ii; ++i) {
            ext = this.validFileExtensions[i];
            if (name.slice(-ext.length).toLowerCase() === ext) {
                valid = true;
                break;
            }
        }
        return valid || this.invalidFileExtensionText + '<br/>' + this.validFileExtensions.join(", ");
    },
    createWorkspacesCombo: function() {
        return {
            xtype: "combo",
            name: "workspace",
            ref: "workspace",
            fieldLabel: this.workspaceLabel,
            store: Ext.create('Ext.data.Store', {
                proxy: {
                    type: 'ajax',
                    url: this.getWorkspacesUrl(),
                    reader: {
                        type: 'json',
                        root: "workspaces.workspace"
                    }
                },
                autoLoad: true,
                model: 'gxp.data.DataStore'
            }),
            displayField: "name",
            valueField: "name",
            queryMode: "local",
            allowBlank: true,
            triggerAction: "all",
            forceSelection: true,
            listeners: {
                select: function(combo, records, index) {
                    var record = records[0];
                    this.getDefaultDataStore(record.get('name'));
                    this.fireEvent("workspaceselected", this, record);
                },
                scope: this
            }
        };
    },
    createDataStoresCombo: function() {
        // this store will be loaded whenever a workspace is selected
        var store = Ext.create('Ext.data.JsonStore', {
            autoLoad: false,
            model: 'gxp.data.DataStore'
        });
        this.on({
            workspaceselected: function(panel, record) {
                combo.reset();
                var workspaceUrl = record.get("href");
                store.removeAll();
                store.setProxy(Ext.create('Ext.data.proxy.Ajax', {
                    url: workspaceUrl.split(".json").shift() + "/datastores.json",
                    reader: {
                        type: 'json',
                        root: "dataStores.dataStore"
                    }
                }));
                store.proxy.on('loadexception', addDefault, this);
                store.load();
            },
            scope: this
        });

        var addDefault = function() {
            var defaultData = {
                name: this.dataStoreNewText
            };
            var r = Ext.create(store.model, defaultData);
            store.insert(0, r);
            store.proxy && store.proxy.un('loadexception', addDefault, this);
        };

        store.on('load', addDefault, this);

        var combo = Ext.create('Ext.form.ComboBox', {
            name: "store",
            ref: "dataStore",
            emptyText: this.dataStoreEmptyText,
            fieldLabel: this.dataStoreLabel,
            store: store,
            displayField: "name",
            valueField: "name",
            queryMode: "local",
            allowBlank: true,
            triggerAction: "all",
            forceSelection: true,
            listeners: {
                select: function(combo, records) {
                    var record = records[0];
                    this.fireEvent("datastoreselected", this, record);
                },
                scope: this
            }
        });

        return combo;
    },
    getDefaultDataStore: function(workspace) {
        Ext.Ajax.request({
            url: this.url + '/workspaces/' + workspace + '/datastores/default.json',
            callback: function(options, success, response) {
                this.defaultDataStore = null;
                if (response.status === 200) {
                    var json = Ext.decode(response.responseText);
                    if (workspace === 'default' && json.dataStore && json.dataStore.workspace) {
                        this.down('*[ref=workspace]').setValue(json.dataStore.workspace.name);
                        var store = this.down('*[ref=workspace]').store;
                        var data = {
                            name: json.dataStore.workspace.name,
                            href: json.dataStore.workspace.href
                        };
                        var r = Ext.create(store.model, data);
                        this.fireEvent("workspaceselected", this, r);
                    }
                    //TODO Revisit this logic - currently we assume that stores
                    // with the substring "file" in the type are file based,
                    // and for file-based data stores we want to crate a new
                    // store.
                    if (json.dataStore && json.dataStore.enabled === true && !/file/i.test(json.dataStore.type)) {
                        this.defaultDataStore = json.dataStore.name;
                        this.down('*[ref=dataStore]').setValue(this.defaultDataStore);
                    }
                }
            },
            scope: this
        });
    },
    getUploadUrl: function() {
        return this.url + "/imports";
    },
    getWorkspacesUrl: function() {
        return this.url + "/workspaces.json";
    },
    handleUploadResponse: function(response) {
        var obj = this.parseResponseText(response.responseText),
            records, tasks, task, msg, i,
            formData = this.getForm().getFieldValues(),
            success = !!obj;
        if (obj) {
            if (typeof obj === "string") {
                success = false;
                msg = obj;
            } else {
                tasks = obj.tasks || [obj.task];
                if (tasks.length === 0) {
                    success = false;
                    msg = "Upload contains no suitable files.";
                } else {
                    for (i=tasks.length-1; i>=0; --i) {
                        task = tasks[i];
                        if (!task) {
                            success = false;
                            msg = "Unknown upload error";
                        } else if (task.state === 'NO_FORMAT') {
                            success = false;
                            msg = "Upload contains no suitable files.";
                        } else if (task.state === 'NO_CRS' && !formData.nativeCRS) {
                            success = false;
                            msg = "Coordinate Reference System (CRS) of source file " + task.data.file + " could not be determined. Please specify manually.";
                        }
                    }
                }
            }
        }
        if (!success) {
            // mark the file field as invlid
            records = [{data: {id: "file", msg: msg || this.uploadFailedText}}];
        } else {
            var itemModified = !!(formData.title || formData["abstract"] || formData.nativeCRS);
            // do not do this for coverages see https://github.com/boundlessgeo/suite/issues/184
            if (itemModified && tasks[0].target.dataStore) {
                this.waitMsg = new Ext.LoadMask((this.ownerCt || this).getEl(), {msg: this.processingUploadText});
                this.waitMsg.show();
                // for now we only support a single task
                var payload = {
                    title: formData.title || undefined,
                    "abstract": formData["abstract"] || undefined,
                    srs: formData.nativeCRS || undefined
                };
                Ext.Ajax.request({
                    method: "PUT",
                    url: tasks[0].layer.href,
                    jsonData: payload,
                    success: this.finishUpload,
                    failure: function(response) {
                        if (this.waitMsg) {
                            this.waitMsg.hide();
                        }
                        var errors = [];
                        try {
                            var json = Ext.decode(response.responseText);
                            if (json.errors) {
                                for (var i=0, ii=json.errors.length; i<ii; ++i) {
                                    errors.push({
                                        id: ~json.errors[i].indexOf('SRS') ? 'nativeCRS' : 'file',
                                        msg: json.errors[i]
                                    });
                                }
                            }
                        } catch(e) {
                            errors.push({
                                id: "file",
                                msg: response.responseText
                            });
                        }
                        this.getForm().markInvalid(errors);
                    },
                    scope: this
                });
            } else {
                this.finishUpload();
            }
        }
        // always return unsuccessful - we manually reset the form in callbacks
        return {success: false, records: records};
    },
    finishUpload: function() {
        Ext.Ajax.request({
            method: "POST",
            url: this._import,
            failure: this.handleFailure,
            success: this.handleUploadSuccess,
            scope: this
        });
    },
    parseResponseText: function(text) {
        var obj;
        try {
            obj = Ext.decode(text);
        } catch (err) {
            // if response type was text/plain, the text will be wrapped in a <pre>
            var match = text.match(/^\s*<pre[^>]*>(.*)<\/pre>\s*/);
            if (match) {
                try {
                    obj = Ext.decode(match[1]);
                } catch (err) {
                    obj = match[1];
                }
            }
        }
        return obj;
    },
    handleUploadSuccess: function(response) {
        Ext.Ajax.request({
            method: "GET",
            url: this._import + '?expand=all',
            failure: this.handleFailure,
            success: function(options, success, response) {
                if (this.waitMsg) {
                    this.waitMsg.hide();
                }
                this.getForm().reset();
                var details = Ext.decode(response.responseText);
                this.fireEvent("uploadcomplete", this, details);
                delete this._import;
            },
            scope: this
        });
    },
    handleFailure: function(response) {
        // see http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
        if (response && response.status === 1223) {
            this.handleUploadSuccess(response);
        } else {
            if (this.waitMsg) {
                this.waitMsg.hide();
            }
            this.getForm().markInvalid([{file: this.uploadFailedText}]);
        }
    }
});
