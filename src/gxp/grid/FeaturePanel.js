/**
 * @requires GeoExt/selection/FeatureModel.js
 * @requires GeoExt/data/FeatureStore.js
 */

Ext.define('gxp.grid.FeaturePanel', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.gxp_featuregrid',
    requires: ['GeoExt.selection.FeatureModel', 'GeoExt.data.FeatureStore', 'Ext.grid.column.Number', 'Ext.form.DateField', 'Ext.form.TimeField'],
    map: null,
    ignoreFields: null,
    includeFields: null,
    layer: null,
    columnsSortable: true,
    columnMenuDisabled: false,
    initComponent: function(){
        this.ignoreFields = ["feature", "state", "fid"].concat(this.ignoreFields);
        if(this.store) {
            this.columns = this.getColumns(this.store);
            // layer automatically added if map provided, otherwise check for
            // layer in config
            if(this.map) {
                this.layer = new OpenLayers.Layer.Vector(this.id + "_layer");
                this.map.addLayer(this.layer);
            }
        } else {
            this.store = Ext.create('Ext.data.Store');
            this.columns = [];
        }
        if(this.layer) {
            this.selModel = this.selModel || Ext.create('GeoExt.selection.FeatureModel', {
                layerFromStore: false,
                layer: this.layer
            });
            if(this.store instanceof GeoExt.data.FeatureStore) {
                this.store.bind(this.layer);
            }
        }
        if (!this.dateFormat) {
            this.dateFormat = Ext.form.DateField.prototype.format;
        }
        if (!this.timeFormat) {
            this.timeFormat = Ext.form.TimeField.prototype.format;
        }

        this.callParent(arguments);
    },
    onDestroy: function() {
        if(this.initialConfig && this.initialConfig.map &&
           !this.initialConfig.layer) {
            // we created the layer, let's destroy it
            this.layer.destroy();
            delete this.layer;
        }
        this.callParent(arguments);
    },
    setStore: function(store, schema) {
        if (schema) {
            this.schema = schema;
        }
        if (store) {
            if(this.store instanceof GeoExt.data.FeatureStore) {
                this.store.unbind();
            }
            if(this.layer) {
                this.layer.destroyFeatures();
                store.bind(this.layer);
            }
            this.reconfigure(store, this.getColumns(store));
        } else {
            this.reconfigure(
                Ext.create('Ext.data.Store'),
                []
            );
        }
    },
    getColumns: function(store) {
        if (!this.schema && !store.model) {
            return [];
        }
        function getRenderer(format) {
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
        }
        var columns = [],
            customEditors = this.customEditors || {},
            customRenderers = this.customRenderers || {},
            name, type, xtype, format, renderer;
        (this.schema || store.model.fields).each(function(f) {
            if (this.schema) {
                name = f.get("name");
                type = f.get("type").split(":").pop();
                format = null;
                switch (type) {
                    case "date":
                        format = this.dateFormat;
                        break;
                    case "datetime":
                        format = format ? format : this.dateFormat + " " + this.timeFormat;
                        xtype = undefined;
                        renderer = getRenderer(format);
                        break;
                    case "boolean":
                        xtype = "booleancolumn";
                        break;
                    case "string":
                        xtype = "gridcolumn";
                        break;
                    default:
                        xtype = "numbercolumn";
                        break;
                }
            } else {
                name = f.name;
            }
            if (this.ignoreFields.indexOf(name) === -1 &&
               (this.includeFields === null || this.includeFields.indexOf(name) >= 0)) {
                var columnConfig = this.columnConfig ? this.columnConfig[name] : null;
                columns.push(Ext.apply({
                    dataIndex: name,
                    hidden: this.fieldVisibility ?
                        (!this.fieldVisibility[name]) : false,
                    header: this.propertyNames ?
                        (this.propertyNames[name] || name) : name,
                    sortable: this.columnsSortable,
                    menuDisabled: this.columnMenuDisabled,
                    xtype: xtype,
                    editor: customEditors[name] || {
                        xtype: 'textfield'
                    },
                    format: format,
                    renderer: customRenderers[name] ||
                        (xtype ? undefined : renderer)
                }, columnConfig));
            }
        }, this);
        return columns;
    }
});
