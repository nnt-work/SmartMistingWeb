package util;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

/**
 * Cryptographic utility for password hashing and verification.
 * Implements PBKDF2WithHmacSHA256 with 120,000 iterations and salt,
 * with legacy MD5 migration compatibility.
 */
public final class PasswordUtil {

    private static final int ITERATIONS = 120000;
    private static final int KEY_LENGTH = 256;
    private static final int SALT_BYTES = 16;
    private static final String ALGORITHM = "PBKDF2WithHmacSHA256";

    private PasswordUtil() {
    }

    /**
     * Hashes a raw password using PBKDF2WithHmacSHA256.
     *
     * @param password Plaintext password
     * @return Formatted hash string: pbkdf2$<iterations>$<salt>$<hash>
     */
    public static String hashPassword(String password) {
        try {
            byte[] salt = new byte[SALT_BYTES];
            new SecureRandom().nextBytes(salt);
            byte[] hash = derive(password, salt, ITERATIONS);
            return "pbkdf2$" + ITERATIONS + "$" 
                    + Base64.getEncoder().encodeToString(salt) + "$" 
                    + Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new IllegalStateException("Password hashing failed", e);
        }
    }

    private static byte[] derive(String password, byte[] salt, int iterations) throws Exception {
        PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, iterations, KEY_LENGTH);
        try {
            return SecretKeyFactory.getInstance(ALGORITHM).generateSecret(spec).getEncoded();
        } finally {
            spec.clearPassword();
        }
    }

    /**
     * Checks if a stored password hash is using legacy MD5 format.
     *
     * @param stored The stored password hash
     * @return true if 32 hex characters
     */
    public static boolean isLegacyMd5(String stored) {
        return stored != null && stored.matches("^[0-9a-fA-F]{32}$");
    }

    /**
     * Verifies a raw password against a stored hash (PBKDF2 or legacy MD5).
     *
     * @param raw Plaintext password provided by user
     * @param stored Stored hash in database
     * @return true if password matches stored hash
     */
    public static boolean verify(String raw, String stored) {
        if (raw == null || stored == null) {
            return false;
        }
        try {
            if (stored.startsWith("pbkdf2$")) {
                String[] parts = stored.split("\\$");
                if (parts.length != 4) {
                    return false;
                }
                int iterations = Integer.parseInt(parts[1]);
                if (iterations < 10000 || iterations > 1000000) {
                    return false;
                }
                byte[] salt = Base64.getDecoder().decode(parts[2]);
                byte[] expectedHash = Base64.getDecoder().decode(parts[3]);
                byte[] actualHash = derive(raw, salt, iterations);
                return MessageDigest.isEqual(actualHash, expectedHash);
            }

            if (isLegacyMd5(stored)) {
                byte[] hash = MessageDigest.getInstance("MD5").digest(raw.getBytes("UTF-8"));
                StringBuilder sb = new StringBuilder();
                for (byte b : hash) {
                    sb.append(String.format("%02x", b));
                }
                return sb.toString().equalsIgnoreCase(stored);
            }

            return false;
        } catch (Exception e) {
            return false;
        }
    }
}
