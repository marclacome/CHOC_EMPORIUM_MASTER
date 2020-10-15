var CartBadge = new function () {
    var self = this;
    var cartCountSelector;

    this.init = function () {
        self.cartCountSelector = $('.cart-count');
        self.cartCountSelector.removeClass('hidden-count');
    };

    this.show_ajax_busy = function () {
        self.cartCountSelector.removeClass('hidden-count');
        self.cartCountSelector.html('*');
    }

    this.update_cart_quantity_badge = function () {
        var params = {
            type: 'POST',
            url: '/cart/update.js',
            data: 'attributes[dummy]=0',
            dataType: 'json',
            success: function (cart) {
                var cartCountSelector = $('.cart-count');
                cartCountSelector.html(cart.item_count);
            },
            error: function (XMLHttpRequest, textStatus) {
                self.is_busy = false;
                GW_onAjaxError(XMLHttpRequest, textStatus);
            }
        };
        jQuery.ajax(params);
    }

}
