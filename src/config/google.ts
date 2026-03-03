import { OAuth2Client } from 'google-auth-library';
import config from './env';

const googleClient = new OAuth2Client(
  config.google.clientId,
  config.google.clientSecret,
  'https://developers.google.com/oauthplayground'
);

export { googleClient };
