/**
 * @include util.js
 * @requires plugins/GeoServerStyleWriter.js
 * @requires container/StylePropertiesDialog.js
 * @requires tab/RulePanel.js
 * @requires OpenLayers/Renderer.js
 * @include OpenLayers/Renderer/SVG.js
 * @include OpenLayers/Renderer/VML.js
 * @include OpenLayers/Renderer/Canvas.js
 * @include OpenLayers/Style2.js
 * @include OpenLayers/Format/SLD/v1_0_0_GeoServer.js
 * @requires GeoExt/data/AttributeStore.js
 * @requires GeoExt/container/WmsLegend.js
 * @requires GeoExt/container/VectorLegend.js
 */

Ext.define('gxp.data.WMSStylesModel', {
    extend: 'Ext.data.Model',
    // add a userStyle field (not included in styles from
    // GetCapabilities), which will be populated with the userStyle
    // object if GetStyles is supported by the WMS
    fields: [
        "name",
        "title",
        "abstract",
        "legend",
        "userStyle"
    ]
});

Ext.define('gxp.container.WMSStylesDialog', {
    extend: 'Ext.container.Container',
    requires: ['gxp.tab.RulePanel', 'gxp.container.StylePropertiesDialog', 'Ext.data.JsonStore', 'GeoExt.data.AttributeStore', 'GeoExt.container.VectorLegend', 'GeoExt.container.WmsLegend', 'gxp.plugins.GeoServerStyleWriter'],
    alias: 'widget.gxp_wmsstylesdialog',
    statics: {
        createGeoServerStylerConfig: function(layerRecord, url) {
            var layer = layerRecord.getLayer();
            if (!url) {
                url = layerRecord.get("restUrl");
            }
            if (!url) {
                url = layer.url.split("?").shift().replace(/\/(wms|ows)\/?$/, "/rest");
            }
            return {
                xtype: "gxp_wmsstylesdialog",
                layerRecord: layerRecord,
                plugins: [{
                    ptype: "gxp_geoserverstylewriter",
                    baseUrl: url
                }],
                listeners: {
                    "styleselected": function(cmp, style) {
                        layer.mergeNewParams({
                            styles: style
                        });
                    },
                    "modified": function(cmp, style) {
                        cmp.saveStyles();
                    },
                    "saved": function(cmp, style) {
                        layer.mergeNewParams({
                            _olSalt: Math.random(),
                            styles: style
                        });
                    },
                    scope: this
                }
            };
        }
    },
    addStyleText: "Add",
    addStyleTip: "Add a new style",
    chooseStyleText: "Choose style",
    deleteStyleText: "Remove",
    deleteStyleTip: "Delete the selected style",
    editStyleText: "Edit",
    editStyleTip: "Edit the selected style",
    duplicateStyleText: "Duplicate",
    duplicateStyleTip: "Duplicate the selected style",
    addRuleText: "Add",
    addRuleTip: "Add a new rule",
    newRuleText: "New Rule",
    deleteRuleText: "Remove",
    deleteRuleTip: "Delete the selected rule",
    editRuleText: "Edit",
    editRuleTip: "Edit the selected rule",
    duplicateRuleText: "Duplicate",
    duplicateRuleTip: "Duplicate the selected rule",
    cancelText: "Cancel",
    saveText: "Save",
    styleWindowTitle: "User Style: {0}",
    ruleWindowTitle: "Style Rule: {0}",
    stylesFieldsetTitle: "Styles",
    rulesFieldsetTitle: "Rules",
    errorTitle: "Error saving style",
    errorMsg: "There was an error saving the style back to the server.",
    layerRecord: null,
    layerDescription: null,
    symbolType: null,
    stylesStore: null,
    selectedStyle: null,
    selectedRule: null,
    editable: true,
    modified: false,
    dialogCls: Ext.Window,
    initComponent: function() {
        this.addEvents(
            "ready",
            "modified",
            "styleselected",
            "beforesaved",
            "saved"
        );
        var defConfig = {
            layout: "form",
            disabled: true,
            items: [{
                xtype: "fieldset",
                title: this.stylesFieldsetTitle,
                labelWidth: 85,
                style: "margin-bottom: 0;"
            }, {
                xtype: "toolbar",
                style: "border-width: 0 1px 1px 1px; margin-bottom: 10px;",
                items: [
                    {
                        xtype: "button",
                        iconCls: "add",
                        text: this.addStyleText,
                        tooltip: this.addStyleTip,
                        handler: this.addStyle,
                        scope: this
                    }, {
                        xtype: "button",
                        iconCls: "delete",
                        text: this.deleteStyleText,
                        tooltip: this.deleteStyleTip,
                        handler: function() {
                            this.stylesStore.remove(this.selectedStyle);
                        },
                        scope: this
                    }, {
                        xtype: "button",
                        iconCls: "edit",
                        text: this.editStyleText,
                        tooltip: this.editStyleTip,
                        handler: function() {
                            this.editStyle();
                        },
                        scope: this
                    }, {
                        xtype: "button",
                        iconCls: "duplicate",
                        text: this.duplicateStyleText,
                        tooltip: this.duplicateStyleTip,
                        handler: function() {
                            var prevStyle = this.selectedStyle;
                            var newStyle = prevStyle.get(
                                "userStyle").clone();
                            newStyle.isDefault = false;
                            newStyle.name = this.newStyleName();
                            var store = this.stylesStore;
                            store.add(Ext.create(store.model, {
                                "name": newStyle.name,
                                "title": newStyle.title,
                                "abstract": newStyle.description,
                                "userStyle": newStyle
                            }));
                            this.editStyle(prevStyle);
                        },
                        scope: this
                    }
                ]
            }]
        };
        Ext.applyIf(this, defConfig);

        this.createStylesStore();

        this.on({
            "beforesaved": function() { this._saving = true; },
            "saved": function() { delete this._saving; },
            "savefailed": function() {
                Ext.Msg.show({
                    title: this.errorTitle,
                    msg: this.errorMsg,
                    icon: Ext.MessageBox.ERROR,
                    buttons: {ok: true}
                });
                delete this._saving;
            },
            "render": function() {
                gxp.util.dispatch([this.getStyles], function() {
                    this.enable();
                }, this);
            },
            scope: this
        });
        this.callParent(arguments);
    },
    addStyle: function() {
        if(!this._ready) {
            this.on("ready", this.addStyle, this);
            return;
        }
        var prevStyle = this.selectedStyle;
        var store = this.stylesStore;
        var newStyle = new OpenLayers.Style(null, {
            name: this.newStyleName(),
            rules: [this.createRule()]
        });
        store.add(Ext.create(store.model, {
            "name": newStyle.name,
            "userStyle": newStyle
        }));
        this.editStyle(prevStyle);
    },
    editStyle: function(prevStyle) {
        var userStyle = this.selectedStyle.get("userStyle");
        var buttonCfg = {
            bbar: ["->", {
                text: this.cancelText,
                iconCls: "cancel",
                handler: function() {
                    styleProperties.down('*[ref=propertiesDialog]').userStyle = userStyle;
                    styleProperties.close();
                    if (prevStyle) {
                        this._cancelling = true;
                        this.stylesStore.remove(this.selectedStyle);
                        this.changeStyle(prevStyle, {
                            updateCombo: true,
                            markModified: true
                        });
                        delete this._cancelling;
                    }
                },
                scope: this
            }, {
                text: this.saveText,
                iconCls: "save",
                handler: function() {
                    styleProperties.close();
                }
            }]
        };
        var styleProperties = Ext.create(this.dialogCls, Ext.apply(buttonCfg, {
            title: Ext.String.format(this.styleWindowTitle,
                userStyle.title || userStyle.name),
            shortTitle: userStyle.title || userStyle.name,
            bodyBorder: false,
            autoHeight: true,
            closeAction: 'hide',
            width: 300,
            modal: true,
            items: {
                border: false,
                items: {
                    xtype: "gxp_stylepropertiesdialog",
                    ref: "propertiesDialog",
                    userStyle: userStyle.clone(),
                    nameEditable: false,
                    style: "padding: 10px;"
                }
            }
        }));
        this.showDlg(styleProperties);
    },
    createSLD: function(options) {
        options = options || {};
        var sld = {
            version: "1.0.0",
            namedLayers: {}
        };
        var layerName = this.layerRecord.get("name");
        sld.namedLayers[layerName] = {
            name: layerName,
            userStyles: []
        };
        this.stylesStore.each(function(r) {
            if(!options.userStyles ||
                    options.userStyles.indexOf(r.get("name")) !== -1) {
                sld.namedLayers[layerName].userStyles.push(r.get("userStyle"));
            }
        });
        return new OpenLayers.Format.SLD({
            multipleSymbolizers: true,
            profile: "GeoServer"
        }).write(sld);
    },
    saveStyles: function(options) {
        this.modified === true && this.fireEvent("beforesaved", this, options);
    },
    updateStyleRemoveButton: function() {
        var userStyle = this.selectedStyle &&
            this.selectedStyle.get("userStyle");
        this.items.get(1).items.get(1).setDisabled(!userStyle ||
            this.stylesStore.getCount() <= 1 ||  userStyle.isDefault === true);
    },
    updateRuleRemoveButton: function() {
        this.items.get(3).items.get(1).setDisabled(
            !this.selectedRule || this.items.get(2).items.get(0).rules.length < 2
        );
    },
    createRule: function() {
        return new OpenLayers.Rule({
            symbolizers: [new OpenLayers.Symbolizer[this.symbolType]]
        });
    },
    addRulesFieldSet: function() {
        var rulesFieldSet = Ext.create('Ext.form.FieldSet', {
            itemId: "rulesfieldset",
            title: this.rulesFieldsetTitle,
            autoScroll: true,
            style: "margin-bottom: 0;",
            hideMode: "offsets",
            hidden: true
        });
        var rulesToolbar = Ext.create('Ext.Toolbar', {
            style: "border-width: 0 1px 1px 1px;",
            hidden: true,
            items: [
                {
                    xtype: "button",
                    iconCls: "add",
                    text: this.addRuleText,
                    tooltip: this.addRuleTip,
                    handler: this.addRule,
                    scope: this
                }, {
                    xtype: "button",
                    iconCls: "delete",
                    text: this.deleteRuleText,
                    tooltip: this.deleteRuleTip,
                    handler: this.removeRule,
                    scope: this,
                    disabled: true
                }, {
                    xtype: "button",
                    iconCls: "edit",
                    text: this.editRuleText,
                    toolitp: this.editRuleTip,
                    handler: function() {
                        this.layerDescription ?
                            this.editRule() :
                            this.describeLayer(this.editRule);
                    },
                    scope: this,
                    disabled: true
                }, {
                    xtype: "button",
                    iconCls: "duplicate",
                    text: this.duplicateRuleText,
                    tip: this.duplicateRuleTip,
                    handler: this.duplicateRule,
                    scope: this,
                    disabled: true
                }
            ]
        });
        this.add(rulesFieldSet, rulesToolbar);
        this.doLayout();
        return rulesFieldSet;
    },
    addRule: function() {
        var legend = this.items.get(2).items.get(0);
        this.selectedStyle.get("userStyle").rules.push(
            this.createRule()
        );
        legend.update();
        // mark the style as modified
        this.selectedStyle.store.afterEdit(this.selectedStyle);
        this.updateRuleRemoveButton();
    },
    removeRule: function() {
        var selectedRule = this.selectedRule;
        this.items.get(2).items.get(0).unselect();
        Ext.Array.remove(this.selectedStyle.get("userStyle").rules, selectedRule);
        // mark the style as modified
        this.afterRuleChange();
    },
    duplicateRule: function() {
        var legend = this.items.get(2).items.get(0);
        var newRule = this.selectedRule.clone();
        this.selectedStyle.get("userStyle").rules.push(
            newRule
        );
        legend.update();
        // mark the style as modified
        this.selectedStyle.store.afterEdit(this.selectedStyle);
        this.updateRuleRemoveButton();
    },
    editRule: function() {
        var rule = this.selectedRule;
        var origRule = rule.clone();

        var ruleDlg = Ext.create(this.dialogCls, {
            title: Ext.String.format(this.ruleWindowTitle,
                rule.title || rule.name || this.newRuleText),
            shortTitle: rule.title || rule.name || this.newRuleText,
            layout: "fit",
            closeAction: "hide",
            width: 320,
            height: 450,
            modal: true,
            items: [{
                xtype: "gxp_rulepanel",
                ref: "rulePanel",
                symbolType: this.symbolType,
                rule: rule,
                attributes: Ext.create('GeoExt.data.AttributeStore', {
                    url: this.layerDescription.owsURL,
                    baseParams: {
                        "SERVICE": this.layerDescription.owsType,
                        "REQUEST": "DescribeFeatureType",
                        "TYPENAME": this.layerDescription.typeName
                    },
                    method: "GET",
                    disableCaching: false
                }),
                border: false,
                defaults: {
                    autoHeight: true,
                    hideMode: "offsets"
                },
                listeners: {
                    "change": this.saveRule,
                    "tabchange": function() {
                        if (ruleDlg instanceof Ext.Window) {
                            ruleDlg.syncShadow();
                        }
                    },
                    scope: this
                }
            }],
            bbar: ["->", {
                text: this.cancelText,
                iconCls: "cancel",
                handler: function() {
                    this.saveRule(ruleDlg.rulePanel, origRule);
                    ruleDlg.close();
                },
                scope: this
            }, {
                text: this.saveText,
                iconCls: "save",
                handler: function() { ruleDlg.close(); }
            }]
        });
        this.showDlg(ruleDlg);
    },
    saveRule: function(cmp, rule) {
        var style = this.selectedStyle;
        var userStyle = style.get("userStyle");
        var i = userStyle.rules.indexOf(this.selectedRule);
        userStyle.rules[i] = rule;
        this.afterRuleChange(rule);
    },
    afterRuleChange: function(rule) {
        this.selectedRule = rule;
        // mark the style as modified
        this.selectedStyle.setDirty();
        this.markModified();
    },
    setRulesFieldSetVisible: function(visible) {
        // the toolbar
        this.items.get(3).setVisible(visible && this.editable);
        // and the fieldset itself
        this.items.get(2).setVisible(visible);
        this.doLayout();
    },
    parseSLD: function(options, success, response) {
        var data = response.responseXML;
        if (!data || !data.documentElement) {
            data = new OpenLayers.Format.XML().read(response.responseText);
        }
        var layerParams = this.layerRecord.getLayer().params;

        var initialStyle = this.initialConfig.styleName || layerParams.STYLES;
        if (initialStyle) {
            this.selectedStyle = this.stylesStore.getAt(
                this.stylesStore.findExact("name", initialStyle));
        }

        var format = new OpenLayers.Format.SLD({profile: "GeoServer", multipleSymbolizers: true});

        try {
            var sld = format.read(data);

            // add userStyle objects to the stylesStore
            //TODO this only works if the LAYERS param contains one layer
            var userStyles = sld.namedLayers[layerParams.LAYERS].userStyles;

            // add styles from the layer's SLD_BODY *after* the userStyles
            var inlineStyles;
            if (layerParams.SLD_BODY) {
                var sldBody = format.read(layerParams.SLD_BODY);
                inlineStyles = sldBody.namedLayers[layerParams.LAYERS].userStyles;
                Array.prototype.push.apply(userStyles, inlineStyles);
            }

            // our stylesStore comes from the layerRecord's styles - clear it
            // and repopulate from GetStyles
            this.stylesStore.removeAll();
            this.selectedStyle = null;

            var userStyle, record, index, defaultStyle;
            for (var i=0, len=userStyles.length; i<len; ++i) {
                userStyle = userStyles[i];
                // remove existing record - this way we replace styles from
                // userStyles with inline styles.
                index = this.stylesStore.findExact("name", userStyle.name);
                index !== -1 && this.stylesStore.removeAt(index);
                record = Ext.create(this.stylesStore.model, {
                    "name": userStyle.name,
                    "title": userStyle.title,
                    "abstract": userStyle.description,
                    "userStyle": userStyle
                });
                record.phantom = false;
                this.stylesStore.add(record);
                // set the default style if no STYLES param is set on the layer
                if (!this.selectedStyle && (initialStyle === userStyle.name ||
                            (!initialStyle && userStyle.isDefault === true))) {
                    this.selectedStyle = record;
                }
                if (userStyle.isDefault === true) {
                    defaultStyle = record;
                }
            }
            // fallback to the default style, this can happen when the layer referenced
            // a non-existing style as initialStyle
            if (!this.selectedStyle) {
                this.selectedStyle = defaultStyle;
            }

            this.addRulesFieldSet();
            this.createLegend(this.selectedStyle.get("userStyle").rules);

            this.stylesStoreReady();
            layerParams.SLD_BODY && this.markModified();
        }
        catch(e) {
            if (window.console) {
                console.warn(e.message);
            }
            this.setupNonEditable();
        }
    },
    createLegend: function(rules) {
        var R = OpenLayers.Symbolizer.Raster;
        if (R && rules[0] && rules[0].symbolizers[0] instanceof R) {
            throw new Error("Raster symbolizers are not supported.");
        } else {
            this.addVectorLegend(rules);
        }
    },
    setupNonEditable: function() {
        this.editable = false;
        // disable styles toolbar
        this.items.get(1).hide();
        var rulesFieldSet = this.getComponent("rulesfieldset") ||
            this.addRulesFieldSet();
        rulesFieldSet.add(this.createLegendImage());
        this.doLayout();
        // disable rules toolbar
        this.items.get(3).hide();
        this.stylesStoreReady();
    },
    stylesStoreReady: function() {
        // start with a clean store
        this.stylesStore.commitChanges();
        this.stylesStore.on({
            "load": function() {
                this.addStylesCombo();
                this.updateStyleRemoveButton();
            },
            "add": function(store, records, index) {
                this.updateStyleRemoveButton();
                // update the "Choose style" combo's value
                var combo = this.items.get(0).items.get(0);
                this.markModified();
                combo.fireEvent("select", combo, [store.getAt(index)], index);
                combo.setValue(this.selectedStyle.get("name"));
            },
            "remove": function(store, record, index) {
                if (!this._cancelling) {
                    this._removing = true;
                    var newIndex =  Math.min(index, store.getCount() - 1);
                    this.updateStyleRemoveButton();
                    // update the "Choose style" combo's value
                    var combo = this.items.get(0).items.get(0);
                    this.markModified();
                    combo.fireEvent("select", combo, [store.getAt(newIndex)], newIndex);
                    combo.setValue(this.selectedStyle.get("name"));
                    delete this._removing;
                }
            },
            "update": function(store, record) {
                var userStyle = record.get("userStyle");
                var data = {
                    "name": userStyle.name,
                    "title": userStyle.title || userStyle.name,
                    "abstract": userStyle.description
                };
                Ext.apply(record.data, data);
                // make sure that the legend gets updated
                this.changeStyle(record, {
                    updateCombo: true,
                    markModified: true
                });
            },
            scope: this
        });

        this.stylesStore.fireEvent("load", this.stylesStore,
            this.stylesStore.getRange()
        );

        this._ready = true;
        this.fireEvent("ready");
    },
    markModified: function() {
        if(this.modified === false) {
            this.modified = true;
        }
        if (!this._saving) {
            this.fireEvent("modified", this, this.selectedStyle.get("name"));
        }
    },
    createStylesStore: function(callback) {
        var styles = this.layerRecord.get("styles") || [];
        this.stylesStore = Ext.create('Ext.data.JsonStore', {
            data: {
                styles: styles
            },
            proxy: {
                type: 'memory',
                reader: {
                    type: 'json',
                    root: 'styles',
                    idProperty: 'name'
                }
            },
            model: 'gxp.data.WMSStylesModel', 
            listeners: {
                "add": function(store, records) {
                    for(var rec, i=records.length-1; i>=0; --i) {
                        rec = records[i];
                        store.suspendEvents();
                        rec.get("title") || rec.set("title", rec.get("name"));
                        store.resumeEvents();
                    }
                }
            }
        });
    },
    getStyles: function(callback) {
        var layer = this.layerRecord.getLayer();
        if(this.editable === true) {
            var version = layer.params["VERSION"];
            if (parseFloat(version) > 1.1) {
                //TODO don't force 1.1.1, fall back instead
                version = "1.1.1";
            }
            Ext.Ajax.request({
                url: layer.url,
                params: {
                    "SERVICE": "WMS",
                    "VERSION": version,
                    "REQUEST": "GetStyles",
                    "LAYERS": [layer.params["LAYERS"]].join(",")
                },
                method: "GET",
                disableCaching: false,
                success: this.parseSLD,
                failure: this.setupNonEditable,
                callback: callback,
                scope: this
            });
        } else {
            this.setupNonEditable();
        }
    },
    describeLayer: function(callback) {
        if (this.layerDescription) {
            // always return before calling callback
            window.setTimeout(function() {
                callback.call(this);
            }, 0);
        } else {
            var layer = this.layerRecord.getLayer();
            var version = layer.params["VERSION"];
            if (parseFloat(version) > 1.1) {
                //TODO don't force 1.1.1, fall back instead
                version = "1.1.1";
            }
            Ext.Ajax.request({
                url: layer.url,
                params: {
                    "SERVICE": "WMS",
                    "VERSION": version,
                    "REQUEST": "DescribeLayer",
                    "LAYERS": [layer.params["LAYERS"]].join(",")
                },
                method: "GET",
                disableCaching: false,
                success: function(options, success, response) {
                    var result = new OpenLayers.Format.WMSDescribeLayer().read(
                        response.responseXML && response.responseXML.documentElement ?
                            response.responseXML : response.responseText);
                    this.layerDescription = result[0];
                    callback.call(this);
                },
                scope: this
            });
        }
    },
    addStylesCombo: function() {
        var store = this.stylesStore;
        var combo = Ext.create('Ext.form.ComboBox', Ext.apply({
            fieldLabel: this.chooseStyleText,
            store: store,
            editable: true, /* was false but not allowed in combination with typeAhead */
            displayField: "title",
            valueField: "name",
            value: this.selectedStyle ?
                this.selectedStyle.get("title") :
                this.layerRecord.getLayer().params.STYLES || "default",
            disabled: !store.getCount(),
            queryMode: "local",
            maxWidth: 275,
            typeAhead: true,
            triggerAction: "all",
            forceSelection: true,
            anchor: "100%",
            listeners: {
                "select": function(combo, records) {
                    var record = records[0];
                    this.changeStyle(record);
                    if (!record.phantom && !this._removing) {
                        this.fireEvent("styleselected", this, record.get("name"));
                    }
                },
                scope: this
            }
        }, this.initialConfig.stylesComboOptions));
        // add combo to the styles fieldset
        this.items.get(0).add(combo);
        this.doLayout();
    },
    createLegendImage: function() {
        var legend = Ext.create('GeoExt.WMSLegend', {
            showTitle: false,
            layerRecord: this.layerRecord,
            autoScroll: true,
            defaults: {
                listeners: {
                    "render": function(cmp) {
                        cmp.getEl().on({
                            load: function(evt, img) {
                                if (img.getAttribute("src") != cmp.defaultImgSrc) {
                                    this.setRulesFieldSetVisible(true);
                                    if (cmp.getEl().getHeight() > 250) {
                                        legend.setHeight(250);
                                    }
                                }
                            },
                            "error": function() {
                                this.setRulesFieldSetVisible(false);
                            },
                            scope: this
                        });
                    },
                    scope: this
                }
            }
        });
        return legend;
    },
    changeStyle: function(record, options) {
        options = options || {};
        var legend = this.items.get(2).items.get(0);
        this.selectedStyle = record;
        this.updateStyleRemoveButton();
        var styleName = record.get("name");

        if (this.editable === true) {
            var userStyle = record.get("userStyle");
            if (userStyle.isDefault === true) {
                styleName = "";
            }
            var ruleIdx = legend.rules.indexOf(this.selectedRule);
            // replace the legend
            legend.ownerCt.remove(legend);
            this.createLegend(userStyle.rules, {selectedRuleIndex: ruleIdx});
        }
        if (options.updateCombo === true) {
            // update the combo's value with the new name
            this.items.get(0).items.get(0).setValue(userStyle.name);
            options.markModified === true && this.markModified();
        }
    },
    addVectorLegend: function(rules, options) {
        options = Ext.applyIf(options || {}, {enableDD: true});

        this.symbolType = options.symbolType;
        if (!this.symbolType) {
            var typeHierarchy = ["Point", "Line", "Polygon"];
            // use the highest symbolizer type of the 1st rule
            highest = 0;
            var symbolizers = rules[0].symbolizers, symbolType;
            for (var i=symbolizers.length-1; i>=0; i--) {
                symbolType = symbolizers[i].CLASS_NAME.split(".").pop();
                highest = Math.max(highest, typeHierarchy.indexOf(symbolType));
            }
            this.symbolType = typeHierarchy[highest];
        }
        var legend = this.items.get(2).add({
            xtype: "gx_vectorlegend",
            showTitle: false,
            height: rules.length > 10 ? 250 : undefined,
            autoScroll: rules.length > 10,
            rules: rules,
            symbolType: this.symbolType,
            selectOnClick: true,
            enableDD: options.enableDD,
            listeners: {
                "ruleselected": function(cmp, rule) {
                    this.selectedRule = rule;
                    // enable the Remove, Edit and Duplicate buttons
                    var tbItems = this.items.get(3).items;
                    this.updateRuleRemoveButton();
                    tbItems.get(2).enable();
                    tbItems.get(3).enable();
                },
                "ruleunselected": function(cmp, rule) {
                    this.selectedRule = null;
                    // disable the Remove, Edit and Duplicate buttons
                    var tbItems = this.items.get(3).items;
                    tbItems.get(1).disable();
                    tbItems.get(2).disable();
                    tbItems.get(3).disable();
                },
                "rulemoved": function() {
                    this.markModified();
                },
                "afterlayout": function() {
                    var legend = this.items.get(2).down('gx_vectorlegend');
                    // restore selection
                    //TODO QA: avoid accessing private properties/methods
                    if (this.selectedRule !== null &&
                            legend.selectedRule === null &&
                            legend.rules.indexOf(this.selectedRule) !== -1) {
                        legend.selectRuleEntry(this.selectedRule);
                    }
                },
                scope: this
            }
        });
        this.setRulesFieldSetVisible(true);
        return legend;
    },
    newStyleName: function() {
        var layerName = this.layerRecord.get("name");
        return layerName.split(":").pop() + "_" +
            gxp.util.md5(layerName + new Date() + Math.random()).substr(0, 8);
    },
    showDlg: function(dlg) {
        dlg.show();
    }
});

(function() {
    // set SLD defaults for symbolizer
    OpenLayers.Renderer.defaultSymbolizer = {
        fillColor: "#808080",
        fillOpacity: 1,
        strokeColor: "#000000",
        strokeOpacity: 1,
        strokeWidth: 1,
        strokeDashstyle: "solid",
        pointRadius: 3,
        graphicName: "square",
        fontColor: "#000000",
        fontSize: 10,
        haloColor: "#FFFFFF",
        haloOpacity: 1,
        haloRadius: 1,
        labelAlign: 'cm'
    };
})();
