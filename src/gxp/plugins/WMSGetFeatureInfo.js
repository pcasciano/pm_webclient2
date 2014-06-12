/**
 * @requires plugins/Tool.js
 * @requires grid/FeatureEditor.js
 * @requires GeoExt/window/Popup.js
 * @requires OpenLayers/Control/WMSGetFeatureInfo.js
 * @requires OpenLayers/Format/WMSGetFeatureInfo.js
 */

// TODO investigate more why we need this override
// see https://github.com/bartvde/gxp2/issues/5
/*
GeoExt.window.Popup.prototype.position = function() {
    if(this._mapMove === true) {
        this.insideViewport = this.map.getExtent().containsLonLat(this.location);
        if(this.insideViewport !== this.isVisible()) {
            this.setVisible(this.insideViewport);
        }
    }
    if(this.isVisible()) {
        var locationPx = this.map.getPixelFromLonLat(this.location),
            mapBox = Ext.fly(this.map.div).getBox(true),
            top = locationPx.y,
            left = locationPx.x,
            elSize = this.el.getSize(),
            ancSize = this.anc.getSize(),
            ancPos = this.anchorPosition;

        if (ancPos.indexOf("right") > -1 || locationPx.x > mapBox.width / 2) {
            // right
            this.anc.addCls("right");
            var ancRight = this.el.getX(true) + elSize.width -
                           this.anc.getX(true) - ancSize.width;
            left -= elSize.width - ancRight - ancSize.width / 2;
        } else {
            // left
            this.anc.removeCls("right");
            var ancLeft = this.anc.getLeft(true);
            left -= ancLeft + ancSize.width / 2;
        }
        if (ancPos.indexOf("bottom") > -1 || locationPx.y > mapBox.height / 2) {
            // bottom
            this.anc.removeCls("top");
            // position the anchor
            var popupHeight = this.getHeight();
            if (isNaN(popupHeight) === false) {
                this.anc.setTop((popupHeight-1) + "px");
            }
            top -= elSize.height + ancSize.height;
        } else {
            // top
            this.anc.addCls("top");
            // remove eventually set top property (bottom-case)
            this.anc.setTop("");
            top += ancSize.height; // ok
        }

        this.setPosition(left, top);
    }
};
*/
Ext.define('gxp.plugins.WMSGetFeatureInfo', {
    extend: 'gxp.plugins.Tool',
    requires: ['gxp.grid.FeatureEditor', 'Ext.layout.container.Accordion', 'GeoExt.window.Popup'],
    alias: 'plugin.gxp_wmsgetfeatureinfo',
    outputTarget: "map",
    popupCache: null,
    infoActionTip: "Get Feature Info",
    popupTitle: "Feature Info",
    buttonText: "Identify",
    format: "html",
    addActions: function() {
        this.popupCache = {};

        var actions = gxp.plugins.WMSGetFeatureInfo.superclass.addActions.call(this, [{
            showButtonText: this.showButtonText,
            tooltip: this.infoActionTip,
            iconCls: "gxp-icon-getfeatureinfo",
            text: this.buttonText,
            toggleGroup: this.toggleGroup,
            enableToggle: true,
            allowDepress: true,
            toggleHandler: function(button, pressed) {
                for (var i = 0, len = info.controls.length; i < len; i++){
                    if (pressed) {
                        info.controls[i].activate();
                    } else {
                        info.controls[i].deactivate();
                    }
                }
             }
        }]);
        var infoButton = this.actions[0].items[0];

        var info = {controls: []};
        var updateInfo = function() {
            var queryableLayers = this.target.mapPanel.layers.queryBy(function(x){
                return x.get("queryable");
            });

            var map = this.target.mapPanel.map;
            var control;
            for (var i = 0, len = info.controls.length; i < len; i++){
                control = info.controls[i];
                control.deactivate();  // TODO: remove when http://trac.openlayers.org/ticket/2130 is closed
                control.destroy();
            }

            info.controls = [];
            queryableLayers.each(function(x){
                var layer = x.getLayer();
                var vendorParams = Ext.apply({}, this.vendorParams), param;
                if (this.layerParams) {
                    for (var i=this.layerParams.length-1; i>=0; --i) {
                        param = this.layerParams[i].toUpperCase();
                        vendorParams[param] = layer.params[param];
                    }
                }
                var infoFormat = x.get("infoFormat");
                if (Ext.isEmpty(infoFormat)) {
                    // TODO: check if chosen format exists in infoFormats array
                    // TODO: this will not work for WMS 1.3 (text/xml instead for GML)
                    infoFormat = this.format == "html" ? "text/html" : "application/vnd.ogc.gml";
                }
                var control = new OpenLayers.Control.WMSGetFeatureInfo(Ext.applyIf({
                    url: layer.url,
                    queryVisible: true,
                    layers: [layer],
                    infoFormat: infoFormat,
                    vendorParams: vendorParams,
                    eventListeners: {
                        getfeatureinfo: function(evt) {
                            var title = x.get("title") || x.get("name");
                            if (infoFormat == "text/html") {
                                var match = evt.text.match(/<body[^>]*>([\s\S]*)<\/body>/);
                                if (match && !match[1].match(/^\s*$/)) {
                                    this.displayPopup(evt, title, match[1]);
                                }
                            } else if (infoFormat == "text/plain") {
                                this.displayPopup(evt, title, '<pre>' + evt.text + '</pre>');
                            } else if (evt.features && evt.features.length > 0) {
                                this.displayPopup(evt, title, null,  x.get("getFeatureInfo"));
                            }
                        },
                        scope: this
                    }
                }, this.controlOptions));
                map.addControl(control);
                info.controls.push(control);
                if(infoButton.pressed) {
                    control.activate();
                }
            }, this);

        };

        this.target.mapPanel.layers.on("update", updateInfo, this);
        this.target.mapPanel.layers.on("add", updateInfo, this);
        this.target.mapPanel.layers.on("remove", updateInfo, this);

        return actions;
    },
    displayPopup: function(evt, title, text, featureinfo) {
        var popup;
        var popupKey = evt.xy.x + "." + evt.xy.y;
        featureinfo = featureinfo || {};
        if (!(popupKey in this.popupCache)) {
            popup = this.addOutput({
                xtype: "gx_popup",
                title: this.popupTitle,
                layout: "accordion",
                fill: false,
                autoScroll: true,
                location: evt.xy,
                map: this.target.mapPanel,
                width: 250,
                height: 300,
                defaults: {
                    layout: "fit",
                    autoScroll: true,
                    autoHeight: true,
                    autoWidth: true,
                    collapsible: true
                }
            });
            popup.on({
                close: (function(key) {
                    return function(panel){
                        delete this.popupCache[key];
                    };
                })(popupKey),
                scope: this
            });
            this.popupCache[popupKey] = popup;
        } else {
            popup = this.popupCache[popupKey];
        }

        var features = evt.features, config = [];
        if (!text && features) {
            var feature;
            for (var i=0,ii=features.length; i<ii; ++i) {
                feature = features[i];
                config.push(Ext.apply({
                    xtype: "gxp_editorgrid",
                    readOnly: true,
                    listeners: {
                        'beforeedit': function (e) {
                            return false;
                        }
                    },
                    title: feature.fid ? feature.fid : title,
                    feature: feature,
                    fields: featureinfo.fields,
                    propertyNames: featureinfo.propertyNames
                }, this.itemConfig));
            }
        } else if (text) {
            config.push(Ext.apply({
                title: title,
                html: text
            }, this.itemConfig));
        }
        popup.add(config);
        popup.doLayout();
    }

});
