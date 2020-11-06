/*
add to cart from 2 places -
product page = product_add_to_basket_click
product grid = add_to_basket_click

if offer_gift_wrap is false (product has NO GIFT WRAP tag) then ajax_product_to_cart is called.
product is added with no additional properties.

if offer gift wrap is true show_offer_gift_wrap is called and displays the 'add giftwrap' popup
(from gift-wrap-popup.liquid)
*/




function dm(val) {
    dm('---' + val);
}

var GW = new function () {
    var self = this;
    var variant_id;
    var product_id; //never sent to cart - only used internally  elem id's (ie. giftwrap options is in #product_id_giftwrap)
    var product_quantity;
    var product_title;
    var product_url;
    var giftwrap_id;
    var giftwrap_name;
    var display_name;
    var display_variant_name;
    var tag_id;
    var tag_name;
    var message;
    var is_busy = false;

    var giftwrapProductsObj;
    var gwProdMeta;
    var gwCollectionMeta;


    this.init = function () {
        self.is_busy = false;

        $(window).bind('beforeunload', function () {
            if (self.is_busy)
                return 'We are busy sending data to the server. If you leave the page now then the data may be incomplete. Do you really want to leave?';
        });

        $('.pam-quantity-minus').each(function () {
            $(this).bind("click", function () {
                var quantity = parseInt($('#product_bag_quantity').val(), 10) - 1;
                if (quantity == 0)
                    return;
                $('#product_bag_quantity').val(quantity);
            });
        });

        $('.pam-quantity-plus').each(function () {
            $(this).bind("click", function () {
                var quantity = parseInt($('#product_bag_quantity').val(), 10) + 1;
                $('#product_bag_quantity').val(quantity);
            });
        });


        /*V6 - QUANTITIY SELECTORS ON COLLECTION PAGE*/
        $('.pam-quantity-minus-GRID').each(function () {
            $(this).bind("click", function () {
                var quantity = parseInt($('#product_bag_quantity' + $(this).attr('id').replace('pam-quantity-minus', '')).val(), 10) - 1;
                if (quantity == 0)
                    return;
                $('#product_bag_quantity' + $(this).attr('id').replace('pam-quantity-minus', '')).val(quantity);
            });
        });

        $('.pam-quantity-plus-GRID').each(function () {
            $(this).bind("click", function () {
                var quantity = parseInt($('#product_bag_quantity' + $(this).attr('id').replace('pam-quantity-plus', '')).val(), 10) + 1;
                $('#product_bag_quantity' + $(this).attr('id').replace('pam-quantity-plus', '')).val(quantity);
            });
        });

        var giftwrap_products_str = $('#gift_wrap_collection_products').val();

        self.giftwrapProductsObj = JSON.parse(giftwrap_products_str);

        self.gwProdMeta = [];
        self.gwProdMeta = JSON.parse($('#gw_prods_meta').val());
        self.gwCollectionMeta = JSON.parse($('#gift_wrap_collection_meta').val().replace(/'/g, '"'));
    }


    /* -v6- */



    this.reset_all_purchase_params = function () {
        self.variant_id = -1;
        self.product_id = -1;
        self.display_name = "";
        self.display_variant_name = "";
        self.giftwrap_id = -1;
        self.giftwrap_name = "";
        self.tag_id = 'tag_none';
        self.tag_name = "";
        self.message = "";
    };

    var onAddToBasket = function (product_id, num_variants, display_name) {

        self.reset_all_purchase_params();
        self.display_name = display_name;
        if (num_variants == 1) {
            self.product_title = 'NO_VARIANTS';
            self.variant_id = $('#' + product_id + '_no_variants_id').val();
            self.display_variant_name = "";
        }
        else {
            self.variant_id = $('#product_variant_select_' + product_id).find(':selected').val();
            if (self.variant_id == -1) {
                show_message('Please select a size from the list', function () { hide_all_popups() });
                return false;
            }
            self.product_title = $('#product_variant_select_' + product_id).find(':selected').attr('variant_title');
            self.display_variant_name = ', ' + self.product_title;
        }
        return true;

    }

    var gwProductFromVariantId = function (varId) {
        var found;
        for (var i = 0; i < self.giftwrapProductsObj.length; i++) {
            for (var o = 0; o < self.giftwrapProductsObj[i].products.length; o++) {
                if (self.giftwrapProductsObj[i].products[o].id == varId)
                    found = i;
            }
        }
        return self.giftwrapProductsObj[found];
    }



    /*when ADD TO BASKET button is clicked on product page*/
    this.product_add_to_basket_click = function (product_id, num_variants, product_title) {
        if (!onAddToBasket(product_id, num_variants, product_title))
            return;
        var meta = JSON.parse($('#product_meta').val().replace(/'/g, '"'));
        self.product_id = product_id.split('_')[0];
        self.quantity = $('#product_bag_quantity').val();
        if (self.quantity == 1)
            self.show_offer_gift_wrap(false, meta, num_variants);
        else
            self.ajax_product_to_cart();

    };


    /*when ADD TO BASKET button is clicked on product grid*/
    this.add_to_basket_click = function (product_id, product_title, num_variants, product_url) {
        if (!onAddToBasket(product_id, num_variants, product_title))
            return;
        var meta = JSON.parse($('#product_meta_' + product_id).val().replace(/'/g, '"'));

        self.product_id = product_id;
        self.product_url = product_url;
        self.quantity = parseInt($('#product_bag_quantity-' + product_id).val(), 10);

        if (self.quantity == 1)
            self.show_offer_gift_wrap(true, meta, num_variants);
        else
            self.ajax_product_to_cart();
    }


    //show_offer_multiple - we came from the product page, not the grid (not really relevant any more)
    //meta - product.metafields for the product we're adding to basket
    //num_variants - so we can get product id if its a variant
    this.show_offer_gift_wrap = function (show_offer_multiple, meta, num_variants) {
        if (self.gwCollectionMeta.hasOwnProperty('collection_enabled') && (!self.gwCollectionMeta.collection_enabled)) {
            self.ajax_product_to_cart();
            return;
        }

        var sel;
        if (num_variants > 1)
            sel = $('#product_variant_select_' + self.product_id).find(':selected').val();
        else
            sel = -1;

        $('#gift_message_textarea').val("");
        $('#popupBoxWrap_details').html(self.display_name + self.display_variant_name);
        var masterMeta = [];
        for (var i = 0; i < meta.giftWrapOptions.length; i++) {
            if (meta.giftWrapOptions[i].variantId == sel)
                masterMeta = meta.giftWrapOptions[i].giftwrapIds;
        }
        var displayOptions = [];

        for (var m = 0; m < masterMeta.length; m++) {
            for (var i = 0; i < self.giftwrapProductsObj.length; i++) {
                for (var o = 0; o < self.giftwrapProductsObj[i].products.length; o++) {
                    if (self.giftwrapProductsObj[i].products[o].id == masterMeta[m]) {
                        displayOptions.push(self.giftwrapProductsObj[i].products[o]);
                    }
                }
            }
        }


        if (!displayOptions.length) //no giftwrap for this product
        {
            if (!meta.default_giftwrap || !self.gwCollectionMeta.default) //don't give it default bag & show gift tag option, do ajax to cart
                self.ajax_product_to_cart();
            else { //add default bag, show gift tag popup
                for (var j = 0; j < self.gwProdMeta.length; j++) {
                    for (var v = 0; v < self.gwProdMeta[j].variants.length; v++) {
                        if (self.gwProdMeta[j].variants[v].id == self.gwCollectionMeta.default) {
                            self.giftwrap_name = self.gwProdMeta[j].variants[v].title;
                        }
                    }
                }
                self.set_giftwrap(-1, "");
            }
            return;
        }

        //add the default (if it exists) at start of giftwrap options list
        if ((self.gwCollectionMeta.default) && (meta.default_giftwrap)) {
            for (var i = 0; i < self.giftwrapProductsObj.length; i++) {
                for (var o = 0; o < self.giftwrapProductsObj[i].products.length; o++) {
                    if (self.giftwrapProductsObj[i].products[o].id == self.gwCollectionMeta.default) {
                        // displayOptions.unshift(self.giftwrapProductsObj[i].products[o]);
                        //id, title, image, price
                        var defaultObj = self.giftwrapProductsObj[i].products[o];
                        defaultObj.id = -1;
                        displayOptions.unshift(defaultObj);
                    }
                }
            }
        }

        var out_wrap_options_text = "<table>";
        var o = 0;
        var i = 0;
        for (o = 0; o < displayOptions.length; o++) {
            var display = true;
            for (var j = 0; j < self.gwProdMeta.length; j++) {
                if (self.gwProdMeta[j].productId.indexOf(displayOptions[o].id) !== -1)
                    display = (!self.gwProdMeta[j].hasOwnProperty('enabled') || self.gwProdMeta[j].enabled);
                else {
                    for (var v = 0; v < self.gwProdMeta[j].variants.length; v++) {
                        if (self.gwProdMeta[j].variants[v].id == displayOptions[o].id) {
                            display = ((!self.gwProdMeta[j].hasOwnProperty('enabled') || self.gwProdMeta[j].enabled) && ((!self.gwProdMeta[j].variants[v].hasOwnProperty('enabled')) || self.gwProdMeta[j].variants[v].enabled));
                        }

                    }
                }
            }

            if (display) {
                var prod = gwProductFromVariantId(displayOptions[o].id)
                out_wrap_options_text += "<tr onclick='GW.set_giftwrap(" + '"' + displayOptions[o].id + '", ' + '"' + displayOptions[o].title + '"' + ")'><td>" + displayOptions[o].title + "</td><td class='giftwrap-img'><img src='" + prod.image + "' ></td > <td>" + displayOptions[o].price + "</td></tr > ";
            }
        }

        if (show_offer_multiple) {
            $('#wrap_popup_offer_multiple').html("Want to add multiple quantities of this product? <a href='" + self.product_url + "'>Click here</a>");
            $('#wrap_popup_offer_multiple').css('display', 'block');
        }
        else
            $('#wrap_popup_offer_multiple').css('display', 'none');

        $('#direct-to-cart-gift-wrap-options').html(out_wrap_options_text);
        $('#popup-mask').css('display', 'block');
        $('#popupBoxWrapper').css('display', 'block');
        $(window).scrollTop(0);


    }

    this.set_giftwrap = function (giftwrap_id, giftwrap_name) {
        $('#popup-mask').css('display', 'block');
        $('#popupBoxWrapper').css('display', 'none');
        self.giftwrap_id = giftwrap_id;
        if (self.giftwrap_id == -1)
            self.giftwrap_name = $('#free_giftwrap_details').val();
        else
            self.giftwrap_name = giftwrap_name;
        $('#popupBoxMessage_details').html(self.display_name + self.display_variant_name + ' | Giftwrap: ' + self.giftwrap_name);
        $('#popupBoxMessageWrapper').css('display', 'block');
        $(window).scrollTop(0);
    };

    this.handle_giftwrap_click = function () {
        $('.popup_radio').each(function () {
            if (this.checked)
                tag_id = this.id;
        });
        if (tag_id == 'tag_none') {
            self.tag_id = tag_id;
            self.message = "";
            self.ajax_product_to_cart();
        }
        else
            self.add_direct_to_cart_message(tag_id, $('#popup_description_' + tag_id).html());
    }


    this.add_direct_to_cart_message = function (tag_id, tag_name) {
        var gift_message = "NONE";
        self.message = "";
        if (tag_id != 'tag_none') {
            var message = clean_message_str($('#gift_message_textarea').val());
            if (message.length) {
                m = message.replace(/<br\/>/g, '\r\n');
                m = m.replace(/<BR\/>/g, '\r\n');
                m = m.replace(/<br \/>/g, '\r\n');
                m = m.replace(/<BR \/>/g, '\r\n');
                self.message = m;
            }


            if (self.message.trim().length == 0) {
                show_message('Your gift message is empty!', function () { hide_all_popups() });
                return;
            }
        }
        self.tag_id = tag_id;
        self.tag_name = tag_name;
        self.ajax_product_to_cart();
    };


    this.ajax_product_to_cart = function () {
        self.is_busy = true;
        var add_str = "id=" + self.variant_id + "&quantity=" + self.quantity;
        if ((self.giftwrap_id != -1) || (self.tag_id != 'tag_none')) {
            add_str += "&properties[GIFTWRAP]=" + self.giftwrap_name;
            if (self.tag_id != 'tag_none') {
                add_str += "&properties[GIFT MESSAGE]=" + self.message;
                add_str += "&properties[GIFT TAG]=" + clean_message_str(self.tag_name);
                add_str += "&properties[GIFT TAG ID]=" + self.tag_id;
            }
            add_str += "&properties[GIFTWRAP ID]=" + self.giftwrap_id;
        }

        var params = {
            type: 'POST',
            url: '/cart/add.js',
            data: add_str,
            dataType: 'json',
            success: function (cart) {
                if ((self.giftwrap_id == -1) && ((self.tag_id == 'tag_none') || (self.tag_id == 'gift_tag_free')))//no giftwrap item to add
                    GW_ajax_product_to_cart_callback();
                else
                    GW_ajax_product_to_cart_update_giftwrap(); //giftwrap is a product so needs to be added to cart items
            },
            error: function (XMLHttpRequest, textStatus) {
                GW_onAjaxError(XMLHttpRequest, textStatus);
            }
        };
        jQuery.ajax(params);
    };

    var GW_ajax_product_to_cart_update_giftwrap = function () {
        if (self.giftwrap_id == -1) {
            GW_ajax_product_to_cart_update_tag();
            return;
        }

        var add_str = "id=" + self.giftwrap_id + "&quantity=" + self.quantity;
        var params = {
            type: 'POST',
            url: '/cart/add.js',
            data: add_str,
            dataType: 'json',
            success: function (cart) {
                if ((self.tag_id == 'tag_none') || (self.tag_id == 'gift_tag_free'))
                    GW_ajax_product_to_cart_callback(cart);
                else
                    GW_ajax_product_to_cart_update_tag(); //tag is a product so needs to be added to cart items
            },
            error: function (XMLHttpRequest, textStatus) {
                GW_onAjaxError(XMLHttpRequest, textStatus);
            }
        };
        jQuery.ajax(params);
    };


    var GW_ajax_product_to_cart_update_tag = function () {
        var add_str = "id=" + self.tag_id + "&quantity=" + self.quantity;
        var params = {
            type: 'POST',
            url: '/cart/add.js',
            data: add_str,
            dataType: 'json',
            success: function (cart) {
                GW_ajax_product_to_cart_callback(self.cart);
            },
            error: function (XMLHttpRequest, textStatus) {
                GW_onAjaxError(XMLHttpRequest, textStatus);
            }
        };
        jQuery.ajax(params);
    };

    var GW_ajax_product_to_cart_callback = function (cart) {
        self.is_busy = false;
        self.cart = cart;
        CartBadge.update_cart_quantity_badge();
        $('#popupBoxConfirmation_details').html(GW_make_confirmation_message());
        show_basket_confirmation();  //confirmation_popups.js/liquid
    }

    var GW_make_confirmation_message = function () {
        var str = "Product: " + self.quantity + ' x ' + self.display_name + self.display_variant_name;
        if (self.giftwrap_name.length)
            str += " | Giftwrap: " + self.giftwrap_name;
        if (self.message.length)
            str += " | Message: " + decodeURIComponent(self.message);
        if (self.tag_id != 'tag_none')
            str += " | Gift Tag: " + self.tag_name;
        str += " has been added to your basket";
        return str;
    }





    var GW_onAjaxError = function (XMLHttpRequest, textStatus) {
        self.is_busy = false;
        var data = eval('(' + XMLHttpRequest.responseText + ')');
        if (!!data.message) {
            alert(data.message + '(' + data.status + '): ' + data.description);
        } else {
            alert('Error : ' + ajaxifyShopify.fullMessagesFromErrors(data).join('; ') + '.');
        }
    };

    this.direct_to_cart_price_select = function (id) {
        if ($('_' + id).find(':selected').val() == -1) {
            $('#price_from_display_' + id).css('display', 'block');
            var options = $('#product_variant_select_' + id + ' option');
            $('#price_money_display_' + id).html($(options[1]).attr('variant_price'))
        }
        else {
            $('#price_from_display_' + id).css('display', 'none');
            var price = $('#product_variant_select_' + id).find(':selected').text();
            $('#price_money_display_' + id).html(price);
        }
    }

    this.product_variant_select = function (id) {
        let sel = $('#product_variant_select_' + id).find(':selected').val();
        if (sel == -1) {
            $('#price_from_display_' + id).css('display', 'inline');
            $('#variant_compare_price_' + id).html($('#compare_price_hidden_' + id).val());
            var options = $('#product_variant_select_' + id + ' option');
            var price_str = $(options[1]).attr('variant_price');
            $('#price_money_display_' + id).html(price_str);
        }
        else {
            var ar = $('#product_variant_select_' + id).find(':selected').text().split('(Was');
            $('#price_from_display_' + id).css('display', 'none');
            var price = $('#product_variant_select_' + id).find(':selected').text();
            var price_str = $('#product_variant_select_' + id).find(':selected').text();
            $('#price_money_display_' + id).html(ar[0]);
            if (ar.length > 1)
                $('#variant_compare_price_' + id).html('(Was ' + ar[1]);
            else
                $('#variant_compare_price_' + id).html('');
        }

        if (typeof variant_images === 'undefined')
            return;


        if (variant_images[sel] != undefined) {
            $('#productPhotoImg').attr('src', variant_images[sel]);
            console.log(variant_images[sel]);
        }
        else {
            $('#productPhotoImg').attr('src', variant_images[-1]);
        }
    }

}
