/**
 * @include util.js
 * @requires plugins/StyleWriter.js
 */

Ext.define('gxp.plugins.GeoServerStyleWriter', {
    extend: 'gxp.plugins.StyleWriter',
    alias: 'plugin.gxp_geoserverstylewriter',
    baseUrl: "/geoserver/rest",
    constructor: function(config) {
        this.initialConfig = config;
        Ext.apply(this, config);
        this.callParent(arguments);
    },
    write: function(options) {
        delete this._failed;
        options = options || {};
        var dispatchQueue = [];
        var store = this.target.stylesStore;
        store.each(function(rec) {
            (rec.phantom || store.getUpdatedRecords().indexOf(rec) !== -1) &&
                this.writeStyle(rec, dispatchQueue);
        }, this);
        var success = function() {
            var target = this.target;
            if (this._failed !== true) {
                // we don't need any callbacks for deleting styles.
                this.deleteStyles();
                var modified = this.target.stylesStore.getUpdatedRecords();
                for (var i=modified.length-1; i>=0; --i) {
                    // mark saved
                    modified[i].phantom = false;
                }
                target.stylesStore.commitChanges();
                options.success && options.success.call(options.scope);
                target.fireEvent("saved", target, target.selectedStyle.get("name"));
            } else {
                target.fireEvent("savefailed", target, target.selectedStyle.get("name"));
            }
        };
        if(dispatchQueue.length > 0) {
            gxp.util.dispatch(dispatchQueue, function() {
                this.assignStyles(options.defaultStyle, success);
            }, this);
        } else {
            this.assignStyles(options.defaultStyle, success);
        }
    },
    writeStyle: function(styleRec, dispatchQueue) {
        var styleName = styleRec.get("userStyle").name;
        dispatchQueue.push(function(callback, storage) {
            Ext.Ajax.request({
                method: styleRec.phantom === true ? "POST" : "PUT",
                url: this.baseUrl + "/styles" + (styleRec.phantom === true ?
                    "" : "/" + styleName + ".xml"),
                headers: {
                    "Content-Type": "application/vnd.ogc.sld+xml; charset=UTF-8"
                },
                xmlData: this.target.createSLD({
                    userStyles: [styleName]
                }),
                failure: function() {
                    this._failed = true;
                    callback.call(this);
                },
                success: styleRec.phantom === true ? function(){
                    Ext.Ajax.request({
                        method: "POST",
                        url: this.baseUrl + "/layers/" +
                            this.target.layerRecord.get("name") + "/styles.json",
                        jsonData: {
                            "style": {
                                "name": styleName
                            }
                        },
                        failure: function() {
                            this._failed = true;
                            callback.call(this);
                        },
                        success: callback,
                        scope: this
                    });
                } : callback,
                scope: this
            });
        });
    },
    assignStyles: function(defaultStyle, callback) {
        var styles = [];
        this.target.stylesStore.each(function(rec) {
            if (!defaultStyle && rec.get("userStyle").isDefault === true) {
                defaultStyle = rec.get("name");
            }
            if (rec.get("name") !== defaultStyle &&
                                this.deletedStyles.indexOf(rec.id) === -1) {
                styles.push({"name": rec.get("name")});
            }
        }, this);
        Ext.Ajax.request({
            method: "PUT",
            url: this.baseUrl + "/layers/" +
                this.target.layerRecord.get("name") + ".json",
            jsonData: {
                "layer": {
                    "defaultStyle": {
                        "name": defaultStyle
                    },
                    "styles": styles.length > 0 ? {
                        "style": styles
                    } : {},
                    "enabled": true
                }
            },
            success: callback,
            failure: function() {
                this._failed = true;
                callback.call(this);
            },
            scope: this
        });
    },
    deleteStyles: function() {
        for (var i=0, len=this.deletedStyles.length; i<len; ++i) {
            Ext.Ajax.request({
                method: "DELETE",
                url: this.baseUrl + "/styles/" + this.deletedStyles[i] +
                    // cannot use params for DELETE requests without jsonData
                    "?purge=true"
            });
        }
        this.deletedStyles = [];
    }

});
