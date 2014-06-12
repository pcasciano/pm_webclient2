/**
 * @requires GeoExt/Form.js
 * @requires plugins/SchemaAnnotations.js
 */

Ext.define('gxp.grid.FeatureEditor', {
    extend: 'Ext.grid.PropertyGrid',
    requires: ['Ext.data.Store', 'GeoExt.Form', 'Ext.form.DateField', 'Ext.form.TimeField'],
    alias: ['plugin.gxp_editorgrid', 'widget.gxp_editorgrid'],
    feature: null,
    schema: null,
    fields: null,
    excludeFields: null,
    propertyNames: null,
    readOnly: null,
    border: false,
    initComponent : function() {
        if (!this.dateFormat) {
            this.dateFormat = Ext.form.DateField.prototype.format;
        }
        if (!this.timeFormat) {
            this.timeFormat = Ext.form.TimeField.prototype.format;
        }
        var feature = this.feature,
            attributes;
        if (this.fields) {
            // determine the order of attributes
            attributes = {};
            for (var i=0,ii=this.fields.length; i<ii; ++i) {
                attributes[this.fields[i]] = feature.attributes[this.fields[i]];
            }
        } else {
            attributes = feature.attributes;
        }
        if (!this.excludeFields) {
            this.excludeFields = [];
        }
        this.sourceConfig = this.sourceConfig || {};
        if(this.schema) {
            var ucFields = this.fields ?
                this.fields.join(",").toUpperCase().split(",") : [];
            this.schema.each(function(r) {
                var type = r.get("type");
                if (type.match(/^[^:]*:?((Multi)?(Point|Line|Polygon|Curve|Surface|Geometry))/)) {
                    // exclude gml geometries
                    return;
                }
                var name = r.get("name");
                if (this.fields) {
                    if (ucFields.indexOf(name.toUpperCase()) == -1) {
                        this.excludeFields.push(name);
                    }
                }
                var value = feature.attributes[name];
                var fieldCfg = GeoExt.Form.recordToField(r);
                if (fieldCfg.xtype === "numberfield") {
                    Ext.apply(fieldCfg, {
                        hideTrigger: true,
                        keyNavEnabled: false,
                        mouseWheelEnabled: false
                    });
                }
                var annotations = this.getAnnotationsFromSchema(r);
                if (annotations && annotations.label) {
                    this.propertyNames = this.propertyNames || {};
                    this.propertyNames[name] = annotations.label;
                }
                var listeners;
                this.sourceConfig[name] = this.sourceConfig[name] || {};
                if (typeof value == "string") {
                    var format;
                    switch(type.split(":").pop()) {
                        case "date":
                            format = this.dateFormat;
                            fieldCfg.editable = false;
                            break;
                        case "dateTime":
                            if (!format) {
                                format = this.dateFormat + " " + this.timeFormat;
                                // make dateTime fields editable because the
                                // date picker does not allow to edit time
                                fieldCfg.editable = true;
                            }
                            fieldCfg.format = format;
                            //TODO When http://trac.osgeo.org/openlayers/ticket/3131
                            // is resolved, remove the listeners assignment below
                            listeners = {
                                "startedit": function(el, value) {
                                    if (!(value instanceof Date)) {
                                        var date = Date.parseDate(value.replace(/Z$/, ""), "c");
                                        if (date) {
                                            this.setValue(date);
                                        }
                                    }
                                }
                            };
                            this.sourceConfig[name].renderer = (function() {
                                return function(value) {
                                    //TODO When http://trac.osgeo.org/openlayers/ticket/3131
                                    // is resolved, change the 5 lines below to
                                    // return value.format(format);
                                    var date = value;
                                    if (typeof value == "string") {
                                        date = Date.parseDate(value.replace(/Z$/, ""), "c");
                                    }
                                    return date ? date.format(format) : value;
                                };
                            })();
                            break;
                        case "boolean":
                            listeners = {
                                "startedit": function(el, value) {
                                    this.setValue(Boolean(value));
                                }
                            };
                            break;
                        default:
                            break;
                    }
                }
                fieldCfg.listeners = listeners;
                this.sourceConfig[name].editor = fieldCfg;
                attributes[name] = value !== undefined ? value : null;
            }, this);
            feature.attributes = attributes;
        }
        this.source = attributes;
        var ucExcludeFields = this.excludeFields.length ?
            this.excludeFields.join(",").toUpperCase().split(",") : [];
        this.viewConfig = {
            forceFit: true,
            getRowClass: function(record) {
                if (ucExcludeFields.indexOf(record.get("name").toUpperCase()) !== -1) {
                    return "x-hide-nosize";
                }
            }
        };
        this.listeners = {
            "beforeedit": function() {
                return this.featureEditor && this.featureEditor.editing;
            },
            "propertychange": function() {
                if (this.featureEditor) {
                    this.featureEditor.setFeatureState(this.featureEditor.getDirtyState());
                }
            },
            scope: this
        };
        //TODO This is a workaround for maintaining the order of the
        // feature attributes. Decide if this should be handled in
        // another way.
        var origSort = Ext.data.Store.prototype.sort;
        Ext.data.Store.prototype.sort = function() {};
        this.callParent(arguments);
        Ext.data.Store.prototype.sort = origSort;

        /**
         * TODO: This is a workaround for getting attributes with undefined
         * values to show up in the property grid.  Decide if this should be
         * handled in another way.
         */
        this.propStore.isEditableValue = function() {return true;};
    },
    init: function(target) {
        this.featureEditor = target;
        this.featureEditor.on("canceledit", this.onCancelEdit, this);
        this.featureEditor.add(this);
        this.featureEditor.doLayout();
    },
    destroy: function() {
        if (this.featureEditor) {
            this.featureEditor.un("canceledit", this.onCancelEdit, this);
            this.featureEditor = null;
        }
        this.callParent(arguments);
    },
    onCancelEdit: function(panel, feature) {
        if (feature) {
            this.setSource(feature.attributes);
        }
    }
});

// use the schema annotations module
Ext.override(gxp.grid.FeatureEditor, gxp.plugins.SchemaAnnotations);
