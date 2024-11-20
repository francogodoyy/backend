import passport from 'passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import dotenv from 'dotenv';
import database from '../db/conexion.js'; // Ajusta la ruta según tu estructura

dotenv.config();

const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.SECRET_KEY
};

passport.use(
    new Strategy(opts, async (jwtPayload, done) => {
        try {
            if (jwtPayload.role === 'admin') {
                return done(null, jwtPayload);
            } else {
                return done(null, false);
            }
        } catch (error) {
            return done(error, false);
        }
    })
);

export default passport;
