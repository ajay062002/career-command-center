package com.ajay.career.controller;

import com.ajay.career.entity.User;
import com.ajay.career.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;

import jakarta.annotation.PostConstruct;
import java.util.Objects;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @PostConstruct
    public void seedUsers() {
        if (userRepository.count() == 0) {
            // Seed Admin
            User admin = User.builder()
                    .username("admin")
                    .email("admin@stemsheetz.com")
                    .password(passwordEncoder.encode("password123"))
                    .role("ROLE_ADMIN")
                    .build();
            userRepository.save(Objects.requireNonNull(admin));

            // Seed Standard User
            User user1 = User.builder()
                    .username("user1")
                    .email("user1@stemsheetz.com")
                    .password(passwordEncoder.encode("password123"))
                    .role("ROLE_USER")
                    .build();
            userRepository.save(Objects.requireNonNull(user1));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("Username already taken");
        }
        // Hash password before saving
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setRole("ROLE_USER");
        return ResponseEntity.ok(userRepository.save(user));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        Optional<User> user = userRepository.findByUsername(username);
        if (user.isPresent() && passwordEncoder.matches(password, user.get().getPassword())) {
            return ResponseEntity.ok(user.get());
        }
        return ResponseEntity.status(401).body("Invalid credentials");
    }
}
