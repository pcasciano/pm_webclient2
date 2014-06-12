/**
 * @requires plugins/WMSSource.js
 * @include OpenLayers/Format/WMSCapabilities/v1_1_1_WMSC.js
 */

Ext.define('gxp.plugins.WMSCSource', {
    extend: 'gxp.plugins.WMSSource',
    alias: 'plugin.gxp_wmscsource',
    version: "1.1.1",
    constructor: function(config) {
        config.baseParams = {
            SERVICE: "WMS",
            REQUEST: "GetCapabilities",
            TILED: true
        };
        if (!config.format) {
            this.format = new OpenLayers.Format.WMSCapabilities({
                keepData: true,
                profile: "WMSC",
                allowFallback: true
            });
        }
        this.callParent(arguments);
    },
    createLayerRecord: function(config) {
        var record = this.callParent(arguments);
        if (!record) {
            return;
        }
        var caps, srs;
        if (this.store.proxy.reader.raw) {
            caps = this.store.proxy.reader.raw.capability;
        }
        var tileSets = (caps && caps.vendorSpecific) ?
            caps.vendorSpecific.tileSets : (config.capability && config.capability.tileSets);
        var layer = record.getLayer();
        if (tileSets) {
            var mapProjection = this.getProjection(record) || this.getMapProjection();
            // look for tileset with same name and equivalent projection
            for (var i=0, len=tileSets.length; i<len; i++) {
                var tileSet = tileSets[i];
                if (tileSet.layers === layer.params.LAYERS) {
                    var tileProjection;
                    for (srs in tileSet.srs) {
                        tileProjection = new OpenLayers.Projection(srs);
                        break;
                    }
                    if (mapProjection.equals(tileProjection)) {
                        var bbox = tileSet.bbox[srs].bbox;
                        layer.projection = tileProjection;
                        layer.addOptions({
                            resolutions: tileSet.resolutions,
                            tileSize: new OpenLayers.Size(tileSet.width, tileSet.height),
                            tileOrigin: new OpenLayers.LonLat(bbox[0], bbox[1])
                        });
                        break;
                    }
                }
            }
        } else if (this.lazy) {
            // lazy loading
            var tileSize = config.tileSize,
                tileOrigin = config.tileOrigin;
            layer.addOptions({
                resolutions: config.resolutions,
                tileSize: tileSize ? new OpenLayers.Size(tileSize[0], tileSize[1]) : undefined,
                tileOrigin: tileOrigin ? OpenLayers.LonLat.fromArray(tileOrigin) : undefined
            });
            if (!tileOrigin) {
                // If tileOrigin was not set, our best bet is to use the map's
                // maxExtent, because GWC's tiling scheme always aligns to the
                // default Web Mercator grid. We don't do this with addOptions
                // because we persist the config from layer.options in
                // getConfigForRecord, and we don't want to persist a guessed
                // configuration.
                var maxExtent;
                if (this.target.map.maxExtent) {
                    maxExtent = this.target.map.maxExtent;
                } else {
                    srs = config.srs || this.target.map.projection;
                    maxExtent = OpenLayers.Projection.defaults[srs].maxExtent;
                }
                if (maxExtent) {
                    layer.tileOrigin = OpenLayers.LonLat.fromArray(maxExtent);
                }
            }
        }
        // unless explicitly configured otherwise, use cached version
        layer.params.TILED = (config.cached !== false) && true;
        return record;
    },
    getConfigForRecord: function(record) {
        var config = gxp.plugins.WMSCSource.superclass.getConfigForRecord.apply(this, arguments),
            name = config.name,
            tileSetsCap,
            layer = record.getLayer();
        if (config.capability && this.store.proxy.reader.raw) {
            var capability = this.store.proxy.reader.raw.capability;
            var tileSets = capability.vendorSpecific && capability.vendorSpecific.tileSets;
            if (tileSets) {
                for (var i=tileSets.length-1; i>=0; --i) {
                    tileSetsCap = tileSets[i];
                    if (tileSetsCap.layers === name && tileSetsCap.srs[layer.projection]) {
                        config.capability.tileSets = [tileSetsCap];
                        break;
                    }
                }
            }
        }
        if (!(config.capability && config.capability.tileSets)) {
            var tileSize = layer.options.tileSize;
            if (tileSize) {
                config.tileSize = [tileSize.w, tileSize.h];
            }
            config.tileOrigin = layer.options.tileOrigin;
            config.resolutions = layer.options.resolutions;
        }
        return Ext.applyIf(config, {
            // the "tiled" property is already used to indicate singleTile
            // the "cached" property will indicate whether to send the TILED param
            cached: !!layer.params.TILED
        });
    }

});
