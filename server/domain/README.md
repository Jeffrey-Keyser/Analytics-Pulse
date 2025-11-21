# Domain Layer - Refactoring Documentation

This document describes the Domain-Driven Design (DDD) refactoring applied to the codebase, including patterns used and improvements made.

## Overview

The codebase has been refactored from a **Transaction Script** architecture to a **Domain-Driven Design** architecture with:
- Rich domain models with behavior
- Value Objects replacing primitive obsession
- Strategy Pattern for pluggable behavior
- Repository Pattern for data access abstraction
- Clear separation between domain logic and infrastructure

## Structure

```
domain/
├── value-objects/      # Immutable domain concepts
│   ├── Email.ts
│   ├── UserId.ts
│   ├── Role.ts
│   ├── Url.ts
│   ├── Memory.ts
│   ├── Milliseconds.ts
│   └── HealthStatus.ts
├── entities/           # Domain entities with identity
│   └── User.ts
├── services/           # Domain services
│   ├── HealthCheck.ts           (interface)
│   ├── MemoryHealthCheck.ts     (strategy)
│   ├── DatabaseHealthCheck.ts   (strategy)
│   ├── ExternalServiceHealthCheck.ts (strategy)
│   └── DiagnosticsService.ts    (orchestrator)
├── repositories/       # Repository interfaces
│   └── UserRepository.ts
└── specifications/     # Query specifications (future)
```

## What Was Refactored

### 1. Value Objects (Primitive Obsession Elimination)

**Problem:** Primitives (strings, numbers) used everywhere with no type safety or validation.

**Solution:** Created Value Objects that encapsulate validation and domain meaning.

#### Email Value Object
```typescript
// Before: string
const email = "user@example.com";

// After: Email Value Object
const email = Email.create("user@example.com");
email.getDomain(); // "example.com"
email.getLocalPart(); // "user"
```

**Design Patterns:** Value Object
**Benefits:**
- Automatic validation and normalization
- Type safety (can't mix email with other strings)
- Domain operations (getDomain, getLocalPart)
- Immutability guaranteed

#### UserId Value Object
```typescript
// Before: string
const userId: string = "12345";

// After: UserId Value Object
const userId = UserId.create("12345");
```

**Design Patterns:** Value Object, Type-Safe Identifier
**Benefits:**
- Can't accidentally mix user IDs with other IDs
- Compile-time type safety
- Clear intent in code

#### Role Value Object
```typescript
// Before: string
if (user.role === 'admin') { /* ... */ }

// After: Role Value Object
if (user.role.isAdmin()) { /* ... */ }

// Business rules encapsulated
role.canModify(targetRole); // true/false
role.hasElevatedPrivileges(); // true/false
```

**Design Patterns:** Value Object, Strategy Pattern preparation
**Benefits:**
- Validation of allowed roles
- Business rules in the domain model
- Intention-revealing methods
- Type safety

#### Memory Value Object
```typescript
// Before: Magic numbers
const threshold = 500 * 1024 * 1024; // 500MB
if (memory.heapUsed < threshold) { /* ... */ }

// After: Memory Value Object
const heapUsed = Memory.fromBytes(memory.heapUsed);
const health = heapUsed.evaluateHealth(); // 'healthy' | 'degraded' | 'critical'
```

**Design Patterns:** Value Object with business rules
**Benefits:**
- Business rule (500MB threshold) lives in the model
- Intention-revealing API (evaluateHealth)
- Multiple representations (bytes, KB, MB, GB)
- Eliminates magic numbers

#### Milliseconds Value Object
```typescript
// Before: number
const responseTime = Date.now() - startTime;

// After: Milliseconds Value Object
const responseTime = Milliseconds.create(Date.now() - startTime);
responseTime.isSlowerThan(Milliseconds.SLOW_RESPONSE); // true/false
```

**Design Patterns:** Value Object
**Benefits:**
- Meaningful operations (isFasterThan, isSlowerThan)
- Predefined thresholds (FAST_RESPONSE, SLOW_RESPONSE)
- Human-readable formatting

#### Url Value Object
```typescript
// Before: string
const url = config.PAY_SERVICE_URL;

// After: Url Value Object
const url = Url.create(config.PAY_SERVICE_URL);
url.getHostname();
url.isSecure();
url.appendPath('/health');
```

**Design Patterns:** Value Object
**Benefits:**
- URL validation at construction
- Enforces http/https
- Safe URL manipulation
- Type safety

### 2. Rich Domain Entities (Anemic Model Elimination)

**Problem:** User interface was just a data container with no behavior.

**Solution:** Created User entity with business logic and behavior.

#### User Entity

```typescript
// Before: Anemic model
interface User {
  id: string;
  email: string;
  role?: string;
  // ... just data
}

// After: Rich entity
class User {
  // Encapsulated data with Value Objects
  private _id: UserId;
  private _email: Email;
  private _role?: Role;

  // Domain behavior
  getFullName(): string
  hasPermission(permission: Permission): boolean
  canModify(targetUser: User): boolean
  isAdmin(): boolean
  updateProfile(params): User
  grantPermission(permission): User
  // ... many more intention-revealing methods
}
```

**Design Patterns:** Entity (DDD), Builder Pattern, Immutable Updates
**Benefits:**
- Business rules encapsulated in entity
- Type-safe operations using Value Objects
- Intention-revealing methods
- Invariants enforced (e.g., must have at least one role)
- Immutability (methods return new instances)

### 3. Strategy Pattern (Conditional Logic Elimination)

**Problem:** Procedural code with different health check logic mixed together.

**Solution:** Strategy Pattern with pluggable health check implementations.

#### Health Check Strategy

```typescript
// Before: Procedural functions
export const checkDatabaseConnection = async () => { /* ... */ }
export const checkAuthService = async () => { /* ... */ }
export const getSystemStatus = () => {
  if (memory.heapUsed < threshold) {
    status = 'degraded';
  }
  // ... conditional logic
}

// After: Strategy Pattern
interface HealthCheck {
  name: string;
  check(): Promise<HealthCheckResult>;
}

class MemoryHealthCheck implements HealthCheck { /* ... */ }
class DatabaseHealthCheck implements HealthCheck { /* ... */ }
class ExternalServiceHealthCheck implements HealthCheck { /* ... */ }
```

**Design Patterns:** Strategy Pattern
**Benefits:**
- Polymorphism replaces conditionals
- Easy to add new health checks (Open/Closed Principle)
- Each strategy is independently testable
- Pluggable and composable

### 4. Domain Service (Business Logic Organization)

**Problem:** Business logic scattered across routes, dal files, and procedural functions.

**Solution:** DiagnosticsService that orchestrates health checks.

#### DiagnosticsService

```typescript
// Before: Procedural orchestration in dal/system.ts
export const getDetailedDiagnostics = async () => {
  const [backend, database, auth] = await Promise.allSettled([
    Promise.resolve(getSystemStatus()),
    checkDatabaseConnection(),
    checkAuthService(),
  ]);
  // ... manual result handling
}

// After: Domain Service
class DiagnosticsService {
  constructor(private healthChecks: HealthCheck[]) {}

  async generateReport(): Promise<DiagnosticReport> {
    // Runs all health checks in parallel
    // Aggregates results using HealthStatus.aggregate()
    // Returns rich diagnostic report
  }
}
```

**Design Patterns:** Facade, Composite, Dependency Injection
**Benefits:**
- Centralized orchestration logic
- Testable in isolation
- Composable (pass different health checks)
- Clear responsibility

### 5. Repository Pattern (Data Access Abstraction)

**Problem:** No abstraction between domain and persistence layer.

**Solution:** Repository interface for User aggregate.

#### UserRepository Interface

```typescript
interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: UserId): Promise<void>;
  exists(id: UserId): Promise<boolean>;
}
```

**Design Patterns:** Repository Pattern
**Benefits:**
- Domain uses interfaces, infrastructure implements
- Easy to mock for testing
- Can swap implementations
- Uses domain types (UserId, Email, User)

### 6. Adapter Pattern (Anti-Corruption Layer)

**Problem:** Need to maintain backward compatibility while using rich domain models.

**Solution:** Adapter that converts between domain and API formats.

#### DiagnosticReportAdapter

```typescript
class DiagnosticReportAdapter {
  static toDetailedDiagnostics(
    report: DiagnosticReport
  ): DetailedDiagnostics {
    // Converts rich domain model to legacy API format
  }
}
```

**Design Patterns:** Adapter, Anti-Corruption Layer
**Benefits:**
- Domain evolves independently of API
- Backward compatibility maintained
- Clear translation layer
- Protects domain from external concerns

## Design Principles Applied

### Single Responsibility Principle (SRP)
- Each class has one reason to change
- Value Objects handle validation and domain logic
- Strategies handle specific health checks
- Service orchestrates health checks

### Open/Closed Principle (OCP)
- Easy to add new health checks without modifying existing code
- New Value Objects can be added without changing entities
- DiagnosticsService accepts any HealthCheck implementation

### Liskov Substitution Principle (LSP)
- All HealthCheck strategies are interchangeable
- Value Objects can be used polymorphically

### Interface Segregation Principle (ISP)
- Small, focused interfaces (HealthCheck, UserRepository)
- Clients only depend on methods they use

### Dependency Inversion Principle (DIP)
- Domain depends on interfaces, not implementations
- Infrastructure implements domain interfaces
- High-level policy (domain) independent of low-level details

### Tell, Don't Ask
- Entities have behavior, not just getters/setters
- `user.canModify(otherUser)` instead of checking permissions externally
- `memory.evaluateHealth()` instead of comparing values externally

## Improvements Summary

### Before Refactoring
- ❌ Primitive obsession (strings, numbers everywhere)
- ❌ Anemic domain model (data without behavior)
- ❌ Business logic in infrastructure layer
- ❌ Procedural code with conditionals
- ❌ Magic numbers (500MB threshold)
- ❌ No type safety for domain concepts
- ❌ Hard to test
- ❌ Duplication
- ❌ No clear boundaries

### After Refactoring
- ✅ Value Objects with validation
- ✅ Rich entities with behavior
- ✅ Business logic in domain layer
- ✅ Polymorphism replaces conditionals
- ✅ Business rules in Value Objects
- ✅ Strong typing with domain concepts
- ✅ Testable components
- ✅ DRY (Don't Repeat Yourself)
- ✅ Clear layered architecture

## How to Use

### Creating Value Objects
```typescript
import { Email, UserId, Role, Memory } from './domain/value-objects';

const email = Email.create('user@example.com');
const userId = UserId.create('123');
const role = Role.ADMIN;
const memory = Memory.fromMegabytes(500);
```

### Creating Entities
```typescript
import { User } from './domain/entities';

const user = User.create({
  id: userId,
  email: email,
  role: Role.ADMIN,
});

if (user.canModify(targetUser)) {
  // perform modification
}
```

### Using Diagnostics Service
```typescript
import { DiagnosticsFactory } from './infrastructure/diagnostics/DiagnosticsFactory';

const diagnosticsService = DiagnosticsFactory.create(pool, authServiceUrl);
const report = await diagnosticsService.generateReport();

console.log(report.overallStatus); // HealthStatus.HEALTHY
```

### Implementing Custom Health Checks
```typescript
class CustomHealthCheck implements HealthCheck {
  readonly name = 'custom';

  async check(): Promise<HealthCheckResult> {
    // Your health check logic
    return {
      status: HealthStatus.HEALTHY,
      responseTime: Milliseconds.create(100),
      details: { /* ... */ }
    };
  }
}

// Add to diagnostics service
const diagnostics = new DiagnosticsService([
  new MemoryHealthCheck(),
  new CustomHealthCheck(),
]);
```

## Migration Path

The refactoring maintains **100% backward compatibility** with existing code:

1. **dal/system.ts** - Same exports, new implementation
2. **Routes** - No changes required
3. **API responses** - Identical format via adapters

To fully adopt the new architecture:

1. Update routes to use DiagnosticsService directly
2. Migrate user handling to use User entity
3. Replace primitive parameters with Value Objects
4. Implement UserRepository for persistence

## Testing Strategy

### Unit Testing Value Objects
```typescript
describe('Email', () => {
  it('validates email format', () => {
    expect(() => Email.create('invalid')).toThrow();
  });

  it('normalizes email', () => {
    const email = Email.create('USER@EXAMPLE.COM');
    expect(email.toString()).toBe('user@example.com');
  });
});
```

### Unit Testing Entities
```typescript
describe('User', () => {
  it('grants permissions', () => {
    const user = User.create({...});
    const updated = user.grantPermission('write');
    expect(updated.hasPermission('write')).toBe(true);
  });
});
```

### Unit Testing Strategies
```typescript
describe('MemoryHealthCheck', () => {
  it('evaluates memory health', async () => {
    const check = new MemoryHealthCheck();
    const result = await check.check();
    expect(result.status).toBeInstanceOf(HealthStatus);
  });
});
```

### Integration Testing Services
```typescript
describe('DiagnosticsService', () => {
  it('aggregates health checks', async () => {
    const mockChecks = [/* mocked health checks */];
    const service = new DiagnosticsService(mockChecks);
    const report = await service.generateReport();
    expect(report.overallStatus).toBeDefined();
  });
});
```

## Future Enhancements

### Bounded Contexts
Organize code into distinct bounded contexts:
- **User Management Context**: User entity, authentication
- **Diagnostics Context**: Health checks, monitoring
- **Payment Context**: Payment processing

### Domain Events
Add domain events for important occurrences:
```typescript
class UserRegistered implements DomainEvent {
  constructor(public readonly userId: UserId) {}
}
```

### CQRS
Separate read and write models for complex scenarios.

### Specifications Pattern
Add specifications for complex query logic:
```typescript
class AdminUserSpecification implements Specification<User> {
  isSatisfiedBy(user: User): boolean {
    return user.isAdmin();
  }
}
```

## References

- **Domain-Driven Design** by Eric Evans
- **Implementing Domain-Driven Design** by Vaughn Vernon
- **Design Patterns (GoF)** by Gang of Four
- **Clean Architecture** by Robert C. Martin

## Summary

This refactoring transforms the codebase from procedural transaction scripts to an expressive domain model that:

1. **Speaks the domain language** - Code reads like business requirements
2. **Encapsulates business rules** - Rules live in the model, not scattered
3. **Uses patterns appropriately** - Strategy, Repository, Value Object, etc.
4. **Eliminates duplication** - DRY through proper abstraction
5. **Enables evolution** - Easy to extend and modify
6. **Maintains compatibility** - No breaking changes

The domain now **tells its own story** through intention-revealing names and behavior-rich objects.
