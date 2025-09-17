const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testDatabaseConnection() {
  try {
    console.log('🧪 Testing database connection...')

    // Test 1: Check if we can query meals (our sample data)
    console.log('\n1️⃣ Querying sample meals...')
    const meals = await prisma.meal.findMany()
    console.log(`✅ Found ${meals.length} meals in database:`)
    meals.forEach(meal => {
      console.log(`  - ${meal.name} (${meal.prepEffortTag})`)
    })

    // Test 2: Create a test user
    console.log('\n2️⃣ Creating test user...')
    const testUser = await prisma.user.create({
      data: {
        id: 'test-user-001',
        email: 'test@example.com',
        passwordHash: 'hashed-password-123',
        ageConfirmed: true,
        consentStatus: 'granted',
        subscriptionTier: 'FREE'
      }
    })
    console.log('✅ Test user created:', testUser.email)

    // Test 3: Create preference profile
    console.log('\n3️⃣ Creating preference profile...')
    const preferenceProfile = await prisma.preferenceProfile.create({
      data: {
        id: 'profile-001',
        userId: testUser.id,
        allowedMeats: ['beef', 'chicken'],
        exclusions: ['pork'],
        prepTimePreference: 30,
        budgetRange: '100-150',
        cookingSkill: 'beginner',
        nutritionalProfile: 'STRICT'
      }
    })
    console.log('✅ Preference profile created:', preferenceProfile.id)

    // Test 4: Query user with profile
    console.log('\n4️⃣ Querying user with profile...')
    const userWithProfile = await prisma.user.findUnique({
      where: { id: testUser.id },
      include: {
        preferenceProfile: true
      }
    })
    console.log('✅ User with profile:', {
      email: userWithProfile.email,
      hasProfile: !!userWithProfile.preferenceProfile,
      allowedMeats: userWithProfile.preferenceProfile?.allowedMeats
    })

    console.log('\n🎉 Database connection test completed successfully!')

  } catch (error) {
    console.error('❌ Database test failed:', error.message)
    console.error('Full error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabaseConnection()