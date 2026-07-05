import numpy as np 

def calc(x1,x2,y1,
         y2,z1,z2,
         vx1,vx2,vy1,
         vy2,vz1,vz2,
         l1,l2,
         g,dt):
    
    r1 = np.array([x1,y1,z1], dtype=float) # position vector for bob1
    r2 = np.array([x2,y2,z2], dtype=float) # position vector for bob2

    # note: a position vector is a mathematical object which tells you how much to move along each of the 
    #       3 axes to reach a specific point
    # like a displacement manual

    v1 = np.array([vx1,vy1,vz1], dtype=float) # velocity vector for bob1
    v2 = np.array([vx2,vy2,vz2], dtype=float) # velocity vector for bob2

    # velocity vector is a mathematical object describing how fast you are moving 
    # in each 3 axis' direction at this instant
    
    a1 = np.array([0,0,-g]) # gravity acceleration vector for bob1
    a2 = np.array([0,0,-g]) # gravity acceleration vector for bob2
    
    # euler integration of velocity and position in order to update these values after dt (time step)
    # uses vectorized numpy operations

    # does not respect the constraints (as it calculates the way the bob will move in the tangential direction) 
    # so we must impose them

    v1 += a1 * dt
    v2 += a2 * dt

    r1 += v1 * dt
    r2 += v2 * dt

    r1 = r1 / np.linalg.norm(r1) * l1 # ensures r1 position vector lies on sphere surface with radius l1

    # this is done by making r1 a unit vector with magnitude 1, same direction as r1 and scaling it up 
    # by multiplying it by l1 (the radius)
    
    # note: np.linalg.norm computes magnitude of vector

    d = r2 - r1 # distance between 2 bobs

    r2 = r1 + d / np.linalg.norm(d) * l2 # enforces constraint that position vector r2 must lie on sphere
    
    # surface with radius l2

    # this is all re-scaling of the position vectors so that it fits mathematically to the imposed constraints
    # which in this case are the lengths

    # projects velocities onto rigid rod constraint to prevent deformation of rods (infinitely stiff)
    # NO motion along the rod direction

    # so must remove the velocity component in that direction if rod is infinitely stiff

    dot1 = np.dot(v1, r1) # dot product of position and velocity vector of bob1, velocity in rod direction

    v1 -= (dot1 / (l1*l1)) * r1 

    dot2 = np.dot(v2, d)

    v2 -= (dot2/(l2**2)) * d

    return (
        r1[0], r1[1], r1[2],
        r2[0], r2[1], r2[2],
        v1[0], v1[1], v1[2],
        v2[0], v2[1], v2[2]
    )