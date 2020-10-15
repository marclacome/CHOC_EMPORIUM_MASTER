function clean_message_str(mess)
{
  var new_message = mess;
  new_message = new_message.replace(/[^A-Za-z0-9 &-.,!'\n\r?£]/g, '');
  new_message = encodeURIComponent(new_message);
  new_message = new_message.replace(/%0d%0a/g, '%0A');
  new_message = new_message.replace(/%0D%0A/g, '%0A');
  new_message = new_message.replace(/%0a/g, '%0A');
  new_message = new_message.replace(/%0A/g, '<br />');
  return new_message;
}
