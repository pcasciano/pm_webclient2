/**
 * @requires plugins/Tool.js
 * @requires OpenLayers/Protocol/HTTP.js
 * @requires OpenLayers/Control/SelectFeature.js
 * @requires OpenLayers/Format/WMSGetFeatureInfo.js
 * @requires OpenLayers/Filter/FeatureId.js
 */

Ext.define('gxp.plugins.ClickableFeatures', {
    extend: 'gxp.plugins.Tool',
    featureManager: null,
    autoLoadFeature: false,
    autoLoadedFeature: null,
    toleranceParameters: ["BUFFER", "RADIUS"],
    constructor: function(config) {
        // deal with deprecated autoLoadFeatures config option
        //TODO remove this before we cut a release
        if (config && "autoLoadFeatures" in config) {
            config.autoLoadFeature = config.autoLoadFeatures;
            delete config.autoLoadFeatures;
            if (window.console) {
                console.warn("Deprecated config option 'autoLoadFeatures' for ptype: '" + config.ptype + "'. Use 'autoLoadFeature' instead.");
            }
        }
        this.callParent(arguments);
    },
    noFeatureClick: function(evt) {
        if (!this.selectControl) {
            this.selectControl = new OpenLayers.Control.SelectFeature(
                this.target.tools[this.featureManager].featureLayer,
                this.initialConfig.controlOptions
            );
        }
        var evtLL = this.target.mapPanel.map.getLonLatFromPixel(evt.xy);
        var featureManager = this.target.tools[this.featureManager];
        var page = featureManager.page;
        if (featureManager.visible() == "all" && featureManager.paging && page && page.extent.containsLonLat(evtLL)) {
            // no need to load a different page if the clicked location is
            // inside the current page bounds and all features are visible
            return;
        }

        var layer = featureManager.layerRecord && featureManager.layerRecord.getLayer();
        if (!layer) {
            // if the feature manager has no layer currently set, do nothing
            return;
        }

        // construct params for GetFeatureInfo request
        // layer is not added to map, so we do this manually
        var map = this.target.mapPanel.map;
        var size = map.getSize();
        var params = Ext.applyIf({
            REQUEST: "GetFeatureInfo",
            BBOX: map.getExtent().toBBOX(),
            WIDTH: size.w,
            HEIGHT: size.h,
            X: parseInt(evt.xy.x),
            Y: parseInt(evt.xy.y),
            QUERY_LAYERS: layer.params.LAYERS,
            INFO_FORMAT: "application/vnd.ogc.gml",
            EXCEPTIONS: "application/vnd.ogc.se_xml",
            FEATURE_COUNT: 1
        }, layer.params);
        if (typeof this.tolerance === "number") {
            for (var i=0, ii=this.toleranceParameters.length; i<ii; ++i) {
                params[this.toleranceParameters[i]] = this.tolerance;
            }
        }
        var projection = map.getProjectionObject();
        var layerProj = layer.projection;
        if (layerProj && layerProj.equals(projection)) {
            projection = layerProj;
        }
        if (parseFloat(layer.params.VERSION) >= 1.3) {
            params.CRS = projection.getCode();
        } else {
            params.SRS = projection.getCode();
        }

        var store = Ext.create('GeoExt.data.FeatureStore', {
            fields: {},
            proxy: Ext.create('GeoExt.data.proxy.Protocol', {
                protocol: new OpenLayers.Protocol.HTTP({
                    url: (typeof layer.url === "string") ? layer.url : layer.url[0],
                    params: params,
                    format: new OpenLayers.Format.WMSGetFeatureInfo()
                })
            }),
            autoLoad: true,
            listeners: {
                "load": function(store, records) {
                    if (records.length > 0) {
                        var fid = records[0].raw.fid;
                        var filter = new OpenLayers.Filter.FeatureId({
                            fids: [fid]
                        });

                        var autoLoad = Ext.bind(function() {
                            featureManager.loadFeatures(
                                filter, function(features) {
                                    if (features.length) {
                                        this.autoLoadedFeature = features[0];
                                        this.select(features[0]);
                                    }
                                }, this
                            );
                        }, this);

                        var feature = featureManager.featureLayer.getFeatureByFid(fid);
                        if (feature) {
                            this.select(feature);
                        } else if (featureManager.paging && featureManager.pagingType === gxp.plugins.FeatureManager.QUADTREE_PAGING) {
                            var lonLat = this.target.mapPanel.map.getLonLatFromPixel(evt.xy);
                            featureManager.setPage({lonLat: lonLat}, function() {
                                var feature = featureManager.featureLayer.getFeatureByFid(fid);
                                if (feature) {
                                    this.select(feature);
                                } else if (this.autoLoadFeature === true) {
                                    autoLoad();
                                }
                            }, this);
                        } else {
                            autoLoad();
                        }
                    }
                },
                scope: this
            }
        });
    },
    select: function(feature) {
        this.selectControl.unselectAll();
        this.selectControl.select(feature);
    }
});
